"use strict";

const axios = require("axios");
const { Op } = require("sequelize");
const speakeasy = require("speakeasy");
const throwError = require("../../utils/throwError");
const { Customer, TwoFA, sequelize } = require("../../models");
const { capitalizeFirstLetter } = require("../../utils/capitalizeFirstLetter");
const {
  sendConfirmationEmail,
  sendPasswordResetEmail,
} = require("../../utils/sendEmail");
const { OAuth2Client } = require("google-auth-library");
const { sendTokenResponse } = require("../../utils/sendTokenResponse");
const { assignRoleToUser } = require("../../utils/roleUtils");
const { sendSMS } = require("../../utils/sendSMS");
const { sendTelegramOTP } = require("../../utils/sendTelegramOTP");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const AuthService = {
  async register({
    firstName,
    lastName,
    emailOrPhone,
    password,
    signupMethod,
  }) {
    const t = await sequelize.transaction();
    try {
      const identifierField =
        signupMethod === "email" ? "email" : "phone_number";

      const existingCustomer = await Customer.findOne({
        where: { [identifierField]: { [Op.iLike]: emailOrPhone } },
        transaction: t,
      });

      if (existingCustomer) throwError("User already exists", 409);

      const confirmationCode = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
      const customerData = {
        first_name: capitalizeFirstLetter(firstName),
        last_name: capitalizeFirstLetter(lastName),
        is_active: true,
        social_provider: "none",
      };

      if (signupMethod === "email") {
        customerData.email = emailOrPhone.toLowerCase();
        customerData.password = password;
        customerData.confirmation_code = confirmationCode;
        customerData.confirmation_code_expires = new Date(
          Date.now() + 10 * 60 * 1000
        );
      } else {
        customerData.phone_number = emailOrPhone;
        customerData.password = password;
        customerData.confirmation_code = confirmationCode;
        customerData.confirmation_code_expires = new Date(
          Date.now() + 10 * 60 * 1000
        );
      }

      const newCustomer = await Customer.create(customerData, {
        transaction: t,
      });

      if (signupMethod === "email") {
        await sendConfirmationEmail(
          newCustomer.email,
          newCustomer.first_name,
          newCustomer.last_name,
          confirmationCode
        );
      } else {
        // await sendSMS(
        //   emailOrPhone,
        //   `Hi ${customerData.first_name}, your signup confirmation code is: ${confirmationCode}`
        // );
       const sent = await sendTelegramOTP(emailOrPhone, confirmationCode);

  if (sent) {
    return res.json({
      success: true,
      message: "Verification code sent to Telegram!",
      // otp for testing only
    });
  } else {
    return res.json({
      success: true,
      message: "Code generated. Telegram not found — using fallback (SMS/email later)",
      confirmationCode, // remove in production
    });
  }
      }

      await t.commit();
      const formattedMethod =
        signupMethod === "email" ? "Email" : "Phone Number";

      return {
        message: `User ${customerData.phone_number} registered. Please check your ${formattedMethod}: ${customerData.phone_number} for the confirmation code.`,
        data: {phone_number: customerData.phone_number},
      };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async preLogin({ emailOrPhone, password, signupMethod }) {
    const t = await sequelize.transaction();
    try {
      const identifierField =
        signupMethod === "email" ? "email" : "phone_number";

      const customer = await Customer.findOne({
        where: { [identifierField]: emailOrPhone },
        include: [{ model: TwoFA, as: "twoFA" }],
        transaction: t,
      });

      if (!customer) throwError("Customer user not found.", 404);

      if (
        customer.social_provider &&
        customer.social_provider !== "none" &&
        customer.social_provider_id
      ) {
        throwError(
          "This account was created using a social login provider. Please log in using that method.",
          400
        );
      }

      if (signupMethod === "email" && !customer.email_verified_at)
        throwError("Email not confirmed.", 403);
      if (signupMethod === "phone_number" && !customer.phone_verified_at)
        throwError("Phone not confirmed.", 403);

      if (customer.isLocked()) {
        const remainingMs = new Date(customer.locked_until) - new Date();
        throwError(
          `Account locked. Try again in ${Math.ceil(
            remainingMs / 1000
          )} seconds.`,
          403
        );
      }

      const isMatched = await customer.comparePassword(password);
      if (!isMatched) {
        await customer.markFailedLoginAttempt();
        throwError(
          `Invalid credentials. ${
            5 - customer.failed_login_attempts
          } attempts remaining.`,
          401
        );
      }

      if (!customer.two_factor_enabled) {
        if (t.finished !== "commit") await t.commit();
        await customer.markSuccessfulLogin();

        return {
          success: true,
          message: "Login successful.",
          requires2FA: false,
          customer,
        };
      }

      await t.commit();

      return {
        success: true,
        message: "Credentials verified.",
        requires2FA: true,
        customerId: customer.id,
      };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async verify2FA({ customerId, code, req }) {
    const t = await sequelize.transaction();
    try {
      const customer = await Customer.findByPk(customerId, {
        include: [{ model: TwoFA, as: "twoFA" }],
        transaction: t,
      });

      if (!customer) throwError("User not found.", 404);
      if (!customer.two_factor_enabled) throwError("2FA not enabled.", 400);

      if (!customer.twoFA) throwError("2FA setup incomplete.", 500);
      if (!code) throwError("2FA code is required.", 400);

      const isVerified = speakeasy.totp.verify({
        secret: customer.twoFA.secret_key,
        encoding: "base32",
        token: code,
        window: 1,
      });

      if (!isVerified) throwError("Invalid 2FA code.", 401);

      await customer.markSuccessfulLogin();

      if (req.originalUrl.includes("/customer")) {
        await assignRoleToUser(customer.id, req.originalUrl, t);
        await customer.reload({ transaction: t });
      }

      await t.commit();
      return { customer };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async verifyCode({ emailOrPhone, signupMethod, code }, url, res) {
    const t = await sequelize.transaction();
    try {
      const identifierField =
        signupMethod === "email" ? "email" : "phone_number";
      const customer = await Customer.findOne({
        where: {
          [identifierField]: emailOrPhone,
          confirmation_code: code,
          confirmation_code_expires: { [Op.gt]: new Date() },
        },
        transaction: t,
      });

      if (!customer) throwError("Invalid or expired code.", 400);

      const verifiedField =
        signupMethod === "email" ? "email_verified_at" : "phone_verified_at";

      await customer.update(
        {
          confirmation_code: null,
          confirmation_code_expires: null,
          [verifiedField]: new Date(),
        },
        { transaction: t }
      );
      await assignRoleToUser(customer.id, url, t);
      await customer.reload({ transaction: t });

      await t.commit();

      if (url.includes("/customer")) {
        await sendTokenResponse(customer, 200, res, url);
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
      const identifierField =
        signupMethod === "email" ? "email" : "phone_number";
      const customer = await Customer.findOne({
        where: { [identifierField]: emailOrPhone },
        transaction: t,
      });

      if (!customer) throwError("User not found.", 404);
      if (customer.email_verified_at || customer.phone_verified_at)
        throwError(`${signupMethod} already verified.`, 400);

      const newCode = Math.floor(100000 + Math.random() * 900000).toString();

      await customer.update(
        {
          confirmation_code: newCode,
          confirmation_code_expires: new Date(Date.now() + 10 * 60 * 1000),
        },
        { transaction: t }
      );

      if (signupMethod === "email") {
        await sendConfirmationEmail(
          customer.email,
          customer.first_name,
          customer.last_name,
          newCode
        );
      } else {
        await sendSMS(
          emailOrPhone,
          `Hi ${customer.first_name}, your signup confirmation code is: ${newCode}`
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
      const identifierField =
        signupMethod === "email" ? "email" : "phone_number";
      const customer = await Customer.findOne({
        where: { [identifierField]: { [Op.iLike]: emailOrPhone } },
        transaction: t,
      });

      if (!customer) throwError("User not found.", 404);
      if (
        (signupMethod === "email" && !customer.email_verified_at) ||
        (signupMethod === "phone_number" && !customer.phone_verified_at)
      )
        throwError(`${signupMethod} not verified.`, 400);

      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      await customer.update(
        {
          confirmation_code: resetCode,
          confirmation_code_expires: new Date(Date.now() + 10 * 60 * 1000),
        },
        { transaction: t }
      );

      if (signupMethod === "email") {
        await sendPasswordResetEmail(
          customer.email,
          customer.first_name,
          customer.last_name,
          resetCode
        );
      } else {
        await sendSMS(
          emailOrPhone,
          `Hi ${customer.first_name}, your signup confirmation code is: ${confirmationCode}`
        );
      }

      await t.commit();
      const formattedMethod =
        signupMethod === "email" ? "Email" : "Phone Number";

      return {
        message: `Reset code sent. Please check your ${formattedMethod}.`,
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
      const identifierField =
        signupMethod === "email" ? "email" : "phone_number";
      const customer = await Customer.findOne({
        where: {
          [identifierField]: { [Op.iLike]: emailOrPhone },
          confirmation_code: code,
          confirmation_code_expires: { [Op.gt]: new Date() },
        },
        transaction: t,
      });

      if (!customer) throwError("Invalid or expired reset code.", 400);

      await customer.update(
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
      const [customer, created] = await Customer.findOrCreate({
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

      if (!created && customer.social_provider !== "google") {
        await t.rollback();
        throwError(
          "This account was created using a social login provider. Please log in using that method.",
          400
        );
      }

      await assignRoleToUser(customer.id, req.originalUrl, t);
      await customer.reload({ transaction: t });

      if (!created) {
        await customer.update(
          {
            first_name: given_name,
            last_name: family_name,
            profile_picture: picture,
          },
          { transaction: t }
        );
      }

      await customer.markSuccessfulLogin();
      await t.commit();
      return { customer };
    } catch (err) {
      if (!t.finished) await t.rollback();
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

      const [customer, created] = await Customer.findOrCreate({
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

      if (!created && customer.social_provider !== "facebook") {
        await t.rollback();
        throwError(
          "This account was created using a social login provider. Please log in using that method.",
          400
        );
      }

      await assignRoleToUser(customer.id, req.originalUrl, t);
      await customer.reload({ transaction: t });

      if (!created) {
        await customer.update(
          { first_name, last_name, profile_picture: picture?.data?.url },
          { transaction: t }
        );
      }

      await customer.markSuccessfulLogin();
      await t.commit();
      return { customer };
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
      const customer = await Customer.findByPk(decoded.id);
      if (!customer) throwError("User not found.", 404);
      return { customer, tokenRefreshed: false };
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        const decoded = jwt.decode(token);
        const customer = await Customer.findByPk(decoded.id);
        if (!customer) throwError("User not found.", 404);
        return { customer, tokenRefreshed: true };
      }
      throwError("Invalid user token", 401);
    }
  },
};

module.exports = AuthService;
