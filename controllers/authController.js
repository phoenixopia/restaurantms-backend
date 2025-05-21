"use strict";

require("dotenv").config();

const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");

const { User, sequelize, TwoFA } = require("../models");
const { hashPassword, comparePassword } = require("../utils/hash");
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
  const { firstName, lastName, email, phone_number, password } = req.body;
  const t = await sequelize.transaction();

  try {
    if (!firstName || !lastName || !email || !phone_number || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    const hashedPassword = await hashPassword(password);

    const userData = {
      first_name: capitalizeFirstLetter(firstName),
      last_name: capitalizeFirstLetter(lastName),
      email: email.toLowerCase(),
      phone_number,
      password_hash: hashedPassword,
      is_active: true,
      social_provider: "None",
    };

    const [newUser, created] = await User.findOrCreate({
      where: {
        [Op.or]: [
          { email: { [Op.iLike]: email } },
          { phone_number: { [Op.iLike]: phone_number } },
        ],
      },
      defaults: userData,
      transaction: t,
    });

    if (!created) {
      await t.rollback();
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const confirmationLink = `${process.env.FRONTEND_URL}/confirm/${newUser.id}`;

    await sendConfirmationEmail(
      newUser.email,
      newUser.first_name,
      newUser.last_name,
      confirmationLink
    );
    await t.commit();

    return res.status(201).json({
      success: true,
      message:
        "Please check your email for confirmation to verify your account.",
      user: {
        id: newUser.id,
        email: newUser.email,
        isConfirmed: newUser.isConfirmed,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};
exports.login = async (req, res) => {
  const { email, password, device_type, code } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide email and password." });
  }
  const t = await sequelize.transaction();
  try {
    const user = await User.findOne({
      where: { email: { [Op.iLike]: email } },
      attributes: { include: ["password_hash"] },
      include: [{ model: TwoFA, as: "twoFA" }],
      transaction: t,
      // lock: t.LOCK.UPDATE,
    });
    if (!user) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, message: "No account found with this email." });
    }
    if (!user.isConfirmed) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Email not confirmed. Please check your inbox.",
      });
    }
    if (user.isLocked()) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: `Your account is locked until ${user.locked_until}. Please try again later.`,
      });
    }
    const isMatched = await comparePassword(password, user.password_hash);
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
    }
    const user2FA = await TwoFA.findOne({
      where: { user_id: user.id },
    });
    console.log(user2FA);

    if (!user.twoFA || !user.twoFA.secret_key) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "2FA is enabled but no 2FA secret found for this user.",
        debug: { code, twoFAEnabled: user.twoFA?.is_enabled },
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
exports.logout = async (req, res) => {
  try {
    res.clearCookie("token");
    req.headers["authorization"] = "";
    return res.status(204).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (err) {
    console.error("Logout Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
      stack: err.stack,
    });
  }
};
exports.googleLogin = async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required field." });
  }
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, given_name, family_name } = payload;

    let user = await User.findOne({ where: { email } });
    if (!user) {
      user = await User.create({
        email,
        first_name: given_name,
        last_name: family_name,
        isConfirmed: true,
        provider: "google",
      });
    }

    // Send token
    await sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error("Google Login Error:", error);
    res
      .status(401)
      .json({ success: false, message: "Google authentication failed" });
  }
};
exports.confirmEmail = async (req, res) => {
  const { email, device_type } = req.body;
  const { confirmationCode } = req.params;

  if (!email || !confirmationCode) {
    return res
      .status(400)
      .json({ success: false, message: "Missing confirmation code or email." });
  }
  const t = await sequelize.transaction();
  try {
    const user = await User.findOne({
      where: {
        confirmationCode,
        email: { [Op.iLike]: email },
        isConfirmed: false,
      },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });
    if (!user) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid confirmation code or email.",
      });
    }
    user.isConfirmed = true;
    await user.save({ transaction: t });
    const ip = getClientIp(req);
    user.markSuccessfulLoginAttempt(ip, device_type);
    await t.commit();
  } catch (err) {
    await t.rollback();
    console.error("Error confirming email:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  }
};
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide an email." });
  }
  const t = await sequelize.transaction();
  try {
    const user = await User.findOne({
      where: { email: { [Op.iLike]: email } },
      transaction: t,
    });

    if (!user) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, message: "No account found with this email." });
    }

    const resetToken = user.getResetPasswordToken();

    user.resetToken = resetToken;
    await user.save({ transaction: t });

    const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    await sendPasswordResetEmail(user.email, resetLink);
    await t.commit();
    return res
      .status(200)
      .json({ success: true, message: "Reset code sent successfully." });
  } catch (error) {
    await t.rollback();
    console.error("Forgot password error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};
exports.reset = async (req, res) => {
  const { email, password } = req.body;
  const { resetToken } = req.params;

  if (!password || !resetToken) {
    return res
      .status(400)
      .json({ success: false, message: "Password and token are required." });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters long.",
    });
  }

  const t = await sequelize.transaction();
  try {
    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);

    const user = await User.findOne({
      where: { id: decoded.id, resetToken },
      transaction: t,
    });

    if (!user) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Invalid or expired reset token." });
    }
    const hashedPassword = await hashPassword(password);
    user.password_hash = hashedPassword;
    user.resetToken = null;
    await user.save({ transaction: t });

    await t.commit();
    return res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now log in.",
    });
  } catch (error) {
    await t.rollback();
    console.error("Password reset error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while resetting the password.",
    });
  }
};
