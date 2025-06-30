"use strict";

const axios = require("axios");
const { Op } = require("sequelize");
const speakeasy = require("speakeasy");
const throwError = require("../utils/throwError");
const { User, TwoFA, sequelize } = require("../models");
const { capitalizeFirstLetter } = require("../utils/capitalizeFirstLetter");
const {
  sendConfirmationEmail,
  sendPasswordResetEmail,
} = require("../utils/sendEmail");
const getClientIp = require("../utils/getClientIp");
const { OAuth2Client } = require("google-auth-library");
const { sendTokenResponse } = require("../utils/sendTokenResponse");
const { assignRoleToUser } = require("../utils/roleUtils");
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const AuthService = {
  async register(
    { firstName, lastName, emailOrPhone, password, signupMethod },
    urlPath
  ) {
    const t = await sequelize.transaction();
    try {
      const identifierField = signupMethod === "email" ? "email" : "phone";
      const existingUser = await User.findOne({
        where: { [identifierField]: { [Op.iLike]: emailOrPhone } },
        transaction: t,
      });
      if (existingUser) throwError("User already exists", 409);

      const confirmationCode = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
      const userData = {
        first_name: capitalizeFirstLetter(firstName),
        last_name: capitalizeFirstLetter(lastName),
        is_active: true,
        social_provider: "none",
      };
      if (signupMethod === "email") {
        userData.email = emailOrPhone.toLowerCase();
        userData.password = password;
        userData.confirmation_code = confirmationCode;
        userData.confirmation_code_expires = new Date(
          Date.now() + 10 * 60 * 1000
        );
      }

      const newUser = await User.create(userData, { transaction: t });
      await assignRoleToUser(newUser.id, urlPath, t);
      await newUser.reload({ transaction: t });

      if (signupMethod === "email") {
        await sendConfirmationEmail(
          newUser.email,
          newUser.first_name,
          newUser.last_name,
          confirmationCode
        );
      }

      await t.commit();
      return {
        message: `User registered. Please check your ${signupMethod} for the confirmation code.`,
        data: null,
      };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async login({
    emailOrPhone,
    password,
    signupMethod,
    device_type,
    code,
    req,
  }) {
    const t = await sequelize.transaction();
    try {
      const identifierField = signupMethod === "email" ? "email" : "phone";
      const user = await User.findOne({
        where: { [identifierField]: emailOrPhone },
        include: [{ model: TwoFA, as: "twoFA" }],
        transaction: t,
      });
      if (!user) throwError("No account found.", 404);
      if (signupMethod === "email" && !user.email_verified_at)
        throwError("Email not confirmed.", 403);
      if (signupMethod === "phone" && !user.phone_verified_at)
        throwError("Phone not confirmed.", 403);

      if (user.isLocked()) {
        const remainingMs = new Date(user.locked_until) - new Date();
        throwError(
          `Account locked. Try again in ${Math.ceil(
            remainingMs / 1000
          )} seconds.`,
          403
        );
      }

      const isMatched = await user.comparePassword(password);
      if (!isMatched) {
        await user.markFailedLoginAttempt();
        throwError(
          `Invalid credentials. ${
            5 - user.failed_login_attempts
          } attempts remaining.`,
          401
        );
      }

      const ip = getClientIp(req);
      await user.markSuccessfulLogin(ip, device_type);

      if (user.twoFA?.is_enabled) {
        if (!code) throwError("2FA code required.", 400);
        const isVerified = speakeasy.totp.verify({
          secret: user.twoFA.secret_key,
          encoding: "base32",
          token: code,
          window: 1,
        });
        if (!isVerified) throwError("Invalid 2FA code.", 401);
      }

      if (req.originalUrl.includes("/customer")) {
        await assignRoleToUser(user.id, req.originalUrl, t);
        await user.reload({ transaction: t });
      }

      await t.commit();
      return { user };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async verifyCode({ emailOrPhone, signupMethod, code }, url, res) {
    const t = await sequelize.transaction();
    try {
      const identifierField = signupMethod === "email" ? "email" : "phone";
      const user = await User.findOne({
        where: {
          [identifierField]: emailOrPhone,
          confirmation_code: code,
          confirmation_code_expires: { [Op.gt]: new Date() },
        },
        transaction: t,
      });
      if (!user) throwError("Invalid or expired code.", 400);

      await user.update(
        {
          confirmation_code: null,
          confirmation_code_expires: null,
          email_verified_at: new Date(),
        },
        { transaction: t }
      );
      await t.commit();

      if (url.includes("/customer")) {
        await sendTokenResponse(user, 200, res, url);
        return null;
      }
      return { message: "Verification successful", data: null };
    } catch (err) {
      if (!t.finished) await t.rollback();
      throw err;
    }
  },

  async resendCode({ emailOrPhone, signupMethod }) {
    const t = await sequelize.transaction();
    try {
      const identifierField = signupMethod === "email" ? "email" : "phone";
      const user = await User.findOne({
        where: { [identifierField]: emailOrPhone },
        transaction: t,
      });
      if (!user) throwError("User not found.", 404);
      if (user.email_verified_at || user.phone_verified_at)
        throwError(`${signupMethod} already verified.`, 400);

      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      await user.update(
        {
          confirmation_code: newCode,
          confirmation_code_expires: new Date(Date.now() + 10 * 60 * 1000),
        },
        { transaction: t }
      );

      if (signupMethod === "email") {
        await sendConfirmationEmail(
          user.email,
          user.first_name,
          user.last_name,
          newCode
        );
      }

      await t.commit();
      return { message: "Verification code resent.", data: null };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async forgotPassword({ emailOrPhone, signupMethod }) {
    const t = await sequelize.transaction();
    try {
      const identifierField = signupMethod === "email" ? "email" : "phone";
      const user = await User.findOne({
        where: { [identifierField]: { [Op.iLike]: emailOrPhone } },
        transaction: t,
      });
      if (!user) throwError("No account found.", 404);
      if (
        (signupMethod === "email" && !user.email_verified_at) ||
        (signupMethod === "phone" && !user.phone_verified_at)
      )
        throwError(`${signupMethod} not verified.`, 400);

      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      await user.update(
        {
          confirmation_code: resetCode,
          confirmation_code_expires: new Date(Date.now() + 10 * 60 * 1000),
        },
        { transaction: t }
      );

      if (signupMethod === "email") {
        await sendPasswordResetEmail(
          user.email,
          user.first_name,
          user.last_name,
          resetCode
        );
      }

      await t.commit();
      return {
        message: `Reset code sent. Please check your ${signupMethod}.`,
        data: null,
      };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async resetPassword({ code, newPassword, signupMethod, emailOrPhone }) {
    const t = await sequelize.transaction();
    try {
      const identifierField = signupMethod === "email" ? "email" : "phone";
      const user = await User.findOne({
        where: {
          [identifierField]: { [Op.iLike]: emailOrPhone },
          confirmation_code: code,
          confirmation_code_expires: { [Op.gt]: new Date() },
        },
        transaction: t,
      });
      if (!user) throwError("Invalid or expired reset code.", 400);

      await user.update(
        {
          password: newPassword,
          confirmation_code: null,
          confirmation_code_expires: null,
          failed_login_attempts: 0,
          locked_until: null,
        },
        { transaction: t }
      );
      await t.commit();
      return { message: "Password reset successful.", data: null };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async googleLogin(idToken, req) {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub, email, given_name, family_name, picture } = payload;

    const t = await sequelize.transaction();
    try {
      const [user, created] = await User.findOrCreate({
        where: {
          [Op.or]: [
            { social_provider_id: sub },
            { email: email.toLowerCase() },
          ],
        },
        defaults: {
          first_name: given_name,
          last_name: family_name,
          email: email.toLowerCase(),
          social_provider: "google",
          social_provider_id: sub,
          profile_picture: picture,
          email_verified_at: new Date(),
          is_active: true,
        },
        transaction: t,
      });

      if (!created && user.social_provider !== "google") {
        await t.rollback();
        throwError("Account exists with different method.", 400);
      }

      await assignRoleToUser(user.id, req.originalUrl, t);
      await user.reload({ transaction: t });
      if (!created) {
        await user.update(
          {
            first_name: given_name,
            last_name: family_name,
            profile_picture: picture,
          },
          { transaction: t }
        );
      }

      await user.markSuccessfulLogin(getClientIp(req), "web");
      await t.commit();
      return { user };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async facebookLogin(accessToken, req) {
    const t = await sequelize.transaction();
    try {
      const fbResponse = await axios.get(
        `https://graph.facebook.com/me?fields=id,first_name,last_name,email,picture&access_token=${accessToken}`
      );
      const {
        id: fbId,
        first_name,
        last_name,
        email,
        picture,
      } = fbResponse.data;
      if (!fbId) throwError("Invalid Facebook access token", 401);

      const [user, created] = await User.findOrCreate({
        where: {
          [Op.or]: [
            { social_provider_id: fbId },
            email ? { email: email.toLowerCase() } : null,
          ].filter(Boolean),
        },
        defaults: {
          first_name,
          last_name,
          email: email ? email.toLowerCase() : null,
          social_provider: "facebook",
          social_provider_id: fbId,
          profile_picture: picture?.data?.url || null,
          email_verified_at: new Date(),
          is_active: true,
        },
        transaction: t,
      });

      if (!created && user.social_provider !== "facebook") {
        await t.rollback();
        throwError("Account exists with different method.", 400);
      }

      await assignRoleToUser(user.id, req.originalUrl, t);
      await user.reload({ transaction: t });
      if (!created) {
        await user.update(
          { first_name, last_name, profile_picture: picture?.data?.url },
          { transaction: t }
        );
      }

      await user.markSuccessfulLogin(getClientIp(req), "web");
      await t.commit();
      return { user };
    } catch (err) {
      await t.rollback();
      if (err.response?.data?.error) {
        const fbErr = err.response.data.error;
        throwError(
          `Facebook API error: ${fbErr.message || "Unknown error"}`,
          fbErr.code || 500
        );
      }
      throwError(err.message || "Facebook login failed", 500);
    }
  },

  async refreshOrValidateToken(req) {
    const jwt = require("jsonwebtoken");
    const token =
      req.cookies?.token ||
      req.headers?.authorization?.split(" ")[1] ||
      req.headers?.token;
    if (!token) throwError("No token provided.", 401);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);
      if (!user) throwError("User not found.", 404);
      return { user, tokenRefreshed: false };
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        const decoded = jwt.decode(token);
        const user = await User.findByPk(decoded.id);
        if (!user) throwError("User not found.", 404);
        return { user, tokenRefreshed: true };
      }
      throwError("Invalid token", 401);
    }
  },
};

module.exports = AuthService;
