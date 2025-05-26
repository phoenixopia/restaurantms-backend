"use strict";

require("dotenv").config();

const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");

const { User, sequelize, TwoFA } = require("../models");
const { capitalizeFirstLetter } = require("../utils/capitalizeFirstLetter");
const { sendTokenResponse } = require("../utils/sendTokenResponse");
const {
  sendConfirmationEmail,
  sendPasswordResetEmail,
} = require("../utils/sendEmail");
const getClientIp = require("../utils/getClientIp");
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.register = async (req, res) => {
  const { firstName, lastName, email, phone_number, password, signup_method } =
    req.body;

  if (!firstName || !lastName || !signup_method) {
    return res.status(400).json({
      success: false,
      message: "All Fields are Required!!",
    });
  }

  if (signup_method === "email") {
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required for email signup.",
      });
    }
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format",
    });
  }
  const t = await sequelize.transaction();

  try {
    const first_name = capitalizeFirstLetter(firstName);
    const last_name = capitalizeFirstLetter(lastName);

    let userData = {
      first_name,
      last_name,
      phone_number,
      social_provider: "none",
      is_active: true,
    };

    const confirmationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    if (signup_method === "email") {
      userData.email = email.toLowerCase();
      userData.password = password;
      userData.confirmation_code = confirmationCode;
      userData.confirmation_code_expires = new Date(
        Date.now() + 10 * 60 * 1000
      );
    }

    console.log("User data to create:", userData);

    const [newUser, created] = await User.findOrCreate({
      where: {
        [Op.or]: [
          email ? { email: { [Op.iLike]: email } } : null,
          phone_number ? { phone_number: { [Op.iLike]: phone_number } } : null,
        ].filter(Boolean),
      },
      defaults: userData,
      transaction: t,
    });

    if (!created) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    if (signup_method === "email") {
      await sendConfirmationEmail(
        newUser.email,
        newUser.first_name,
        newUser.last_name,
        confirmationCode
      );
    }

    await t.commit();

    return res.status(201).json({
      success: true,
      message:
        "Please check your email for confirmation to verify your account",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

exports.login = async (req, res) => {
  const { phone_number, email, password, device_type, code } = req.body;
  console.log("Login attempt:", { email, password, code });
  if ((!email && !phone_number) || !password) {
    return res.status(400).json({
      success: false,
      message:
        "Please provide either email or phone number, along with the password.",
    });
  }
  const t = await sequelize.transaction();
  try {
    const whereCondition = email
      ? { email: { [Op.iLike]: email } }
      : { phone_number: { [Op.iLike]: phone_number } };

    const user = await User.findOne({
      where: whereCondition,
      include: [{ model: TwoFA, as: "twoFA" }],
      transaction: t,
    });

    console.log("User found:", user ? user.id : null);

    if (!user) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, message: "No account found with this email." });
    }
    console.log("Email verified:", !!user.email_verified_at);
    if (!user.email_verified_at) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Email not confirmed. Please check your inbox.",
      });
    }
    console.log("Is account locked:", user.isLocked());
    if (user.isLocked()) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: `Your account is locked until ${user.locked_until}. Please try again later.`,
      });
    }
    console.log("Hashed password to store:", user.password);

    const isMatched = await user.comparePassword(password);
    console.log("Password matched:", isMatched);

    if (!isMatched) {
      await user.markFailedLoginAttempt();
      await t.rollback();
      return res.status(401).json({
        success: false,
        message: `Invalid credentials. Your remaining attempts are ${
          5 - user.failed_login_attempts
        }`,
      });
    }
    console.log("2FA enabled:", user.twoFA?.is_enabled);
    const ip = getClientIp(req);
    await user.markSuccessfulLogin(ip, device_type);

    if (user.twoFA?.is_enabled) {
      if (!code) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "Please provide the 2FA code.",
        });
      }

      if (!user.twoFA.secret_key) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "2FA is enabled but no 2FA secret found for this user.",
        });
      }

      const isVerified = speakeasy.totp.verify({
        secret: user.twoFA.secret_key,
        encoding: "base32",
        token: code,
        window: 1,
      });

      if (!isVerified) {
        await t.rollback();
        return res.status(401).json({
          success: false,
          message: "Invalid 2FA code.",
        });
      }
    }

    await t.commit();
    return sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error("Signin Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  }
};

exports.verifyCode = async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({
      success: false,
      message: "Verification code is required",
    });
  }
  const t = await sequelize.transaction();

  try {
    const user = await User.findOne({
      where: {
        confirmation_code: code.toString().trim(),
        confirmation_code_expires: { [Op.gt]: new Date() },
      },
      transaction: t,
    });

    if (!user) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code",
      });
    }

    await user.update(
      {
        email_verified_at: new Date(),
        confirmation_code: null,
        confirmation_code_expires: null,
      },
      { transaction: t }
    );

    await t.commit();
    return res.status(200).json({
      success: true,
      message: "Email successfully verified!",
    });
  } catch (err) {
    await t.rollback();
    console.error("Verification error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.resendCode = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ where: { email: email.toLowerCase() } });

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    if (user.email_verified_at)
      return res
        .status(400)
        .json({ success: false, message: "Email already verified" });

    const newCode = crypto.randomInt(100000, 999999).toString();

    await user.update({
      confirmation_code: newCode,
      confirmation_code_expires: new Date(Date.now() + 10 * 60 * 1000),
    });

    await sendConfirmationEmail(
      user.email,
      user.first_name,
      user.last_name,
      newCode
    );

    return res.status(200).json({ success: true, message: "New code sent" });
  } catch (err) {
    console.error("Resend error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email, phone_number } = req.body;

  if (!email && !phone_number) {
    return res.status(400).json({
      success: false,
      message:
        "Please provide either email or phone number for password reset.",
    });
  }

  const t = await sequelize.transaction();
  try {
    const whereCondition = email
      ? { email: { [Op.iLike]: email } }
      : { phone_number: { [Op.iLike]: phone_number } };

    const user = await User.findOne({
      where: whereCondition,
      transaction: t,
    });

    if (!user) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "No account found with the provided credentials.",
      });
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    if (email) {
      if (!user.email_verified_at) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "Email not verified. Please verify your email first.",
        });
      }

      await user.update(
        {
          confirmation_code: resetCode,
          confirmation_code_expires: new Date(Date.now() + 10 * 60 * 1000),
        },
        { transaction: t }
      );

      await sendPasswordResetEmail(
        user.email,
        user.first_name,
        user.last_name,
        resetCode
      );
    }

    if (phone_number) {
      if (!user.phone_verified_at) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "Phone number not verified. Please verify your phone first.",
        });
      }

      await user.update(
        {
          confirmation_code: resetCode,
          confirmation_code_expires: new Date(Date.now() + 10 * 60 * 1000),
        },
        { transaction: t }
      );

      console.log(`SMS reset code for ${phone_number}: ${resetCode}`);
    }

    await t.commit();
    return res.status(200).json({
      success: true,
      message: `Reset code sent to your ${email ? "email" : "phone"}.`,
    });
  } catch (error) {
    await t.rollback();
    console.error("Forgot password error:", error);
    return res.status(500).json({
      success: false,
      message: "Error processing password reset request.",
    });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, phone_number, code, newPassword, confirmPassword } = req.body;

  if (!newPassword || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "New password and confirmation are required.",
    });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Passwords do not match.",
    });
  }

  const t = await sequelize.transaction();
  try {
    let user;
    const whereCondition = {};

    if (email && code) {
      whereCondition.email = { [Op.iLike]: email };
      whereCondition.confirmation_code = code;
    } else if (phone_number && code) {
      whereCondition.phone_number = { [Op.iLike]: phone_number };
      whereCondition.confirmation_code = code;
    } else {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid reset parameters.",
      });
    }

    user = await User.findOne({
      where: {
        ...whereCondition,
        confirmation_code_expires: { [Op.gt]: new Date() },
      },
      transaction: t,
    });

    if (!user) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset code.",
      });
    }

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
    return res.status(200).json({
      success: true,
      message:
        "Password reset successful. You can now login with your new password.",
    });
  } catch (error) {
    await t.rollback();
    console.error("Reset password error:", error);
    return res.status(500).json({
      success: false,
      message: "Error resetting password.",
    });
  }
};

exports.logout = async (req, res) => {
  const cookieOptions = {
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
  };
  try {
    res.clearCookie("token", cookieOptions);

    return res.status(200).json({
      success: true,
      message: "Successfully logged out",
    });
  } catch (err) {
    console.error("Logout Error:", err);
    return res.status(500).json({
      success: false,
      message: "Error logging out",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

exports.googleLogin = async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({
      success: false,
      message: "Google ID token is required",
    });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const t = await sequelize.transaction();

    try {
      const {
        sub: googleId,
        email,
        given_name,
        family_name,
        picture,
      } = payload;

      const [user, created] = await User.findOrCreate({
        where: {
          [Op.or]: [
            { social_provider_id: googleId },
            { email: email.toLowerCase() },
          ],
        },
        defaults: {
          first_name: given_name || "Google",
          last_name: family_name || "User",
          email: email.toLowerCase(),
          social_provider: "google",
          social_provider_id: googleId,
          profile_picture: picture,
          email_verified_at: new Date(),
          is_active: true,
          password: null,
        },
        transaction: t,
      });

      if (!created && user.social_provider !== "google") {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message:
            "Account exists with different login method. Please use email/password.",
        });
      }

      if (user.social_provider === "google" && req.path === "/login") {
        await t.rollback();
        return res.status(401).json({
          success: false,
          message: "Google-authenticated users must login via Google",
        });
      }

      if (!created) {
        await user.update(
          {
            first_name: given_name || user.first_name,
            last_name: family_name || user.last_name,
            profile_picture: picture || user.profile_picture,
          },
          { transaction: t }
        );
      }

      const ip = getClientIp(req);
      await user.markSuccessfulLogin(ip, "web");

      await t.commit();
      return sendTokenResponse(user, 200, res);
    } catch (error) {
      await t.rollback();
      console.error("Google login error:", error);
      return res.status(500).json({
        success: false,
        message: "Error authenticating with Google",
      });
    }
  } catch (error) {
    console.error("Google token verification failed:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid Google token",
    });
  }
};
