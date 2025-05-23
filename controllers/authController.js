"use strict";

require("dotenv").config();

const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");

const { User, sequelize, TwoFA } = require("../models");
// const { hashPassword, comparePassword } = require("../utils/hash");
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
  const {
    firstName,
    lastName,
    email,
    phone_number,
    password,
    signup_method, // email or phone
  } = req.body;
  const t = await sequelize.transaction();

  try {
    if (!firstName || !lastName || !signup_method) {
      return res.status(400).json({
        success: false,
        message: "All Fields are Required!!",
      });
    }

    const first_name = capitalizeFirstLetter(firstName);
    const last_name = capitalizeFirstLetter(lastName);

    let userData = {
      first_name,
      last_name,
      phone_number,
      social_provider: "none",
      is_active: true,
    };

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

    const confirmationCode = uuidv4();

    userData = {
      ...userData,
      email: email.toLowerCase(),
      password,
      confirmation_code: confirmationCode,
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

    const confirmationLink = `${process.env.FRONTEND_URL}/confirm/${newUser.id}?code=${confirmationCode}`;

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

  if (!email || !password || !phone_number) {
    return res.status(400).json({
      success: false,
      message:
        "Please provide required fields (email, phone number, password).",
    });
  }
  const t = await sequelize.transaction();
  try {
    const user = await User.findOne({
      where: { email: { [Op.iLike]: email } },
      include: [{ model: TwoFA, as: "twoFA" }],
      transaction: t,
    });

    if (!user) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, message: "No account found with this email." });
    }

    if (!user.email_verified_at) {
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
    const isMatched = await user.comparePassword(password);

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
  const { code, email, device_type = "unknown" } = req.body;

  const t = await sequelize.transaction();

  try {
    const user = await User.findOne({
      where: {
        email: { [Op.iLike]: email },
        confirmation_code: code,
        email_verified_at: null,
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!user) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid confirmation code or email.",
      });
    }

    user.email_verified_at = new Date();
    user.confirmation_code = null;
    await user.save({ transaction: t });

    const ip = getClientIp(req);
    await user.markSuccessfulLoginAttempt(ip, device_type);

    await t.commit();
    return res.status(200).json({
      success: true,
      message: "Email confirmed successfully!",
    });
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

/* 
exports.register = async (req, res) => {
  const roleName = req.roleName || 'customer'; // fallback to customer if missing

  // get role from DB
  const role = await Role.findOne({ where: { name: roleName } });
  if (!role) {
    return res.status(500).json({ message: 'Role not found' });
  }

  const userData = {
    ...req.body,
    role_id: role.id,
    // ...other user fields set properly
  };

  // Create user with role_id set
  // ...
};

*/
