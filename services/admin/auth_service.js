"use strict";

const { Op } = require("sequelize");
const throwError = require("../../utils/throwError");
const { User, sequelize } = require("../../models");
const {
  sendConfirmationEmail,
  sendPasswordResetEmail,
} = require("../../utils/sendEmail");

const { sendSMS } = require("../../utils/sendSMS");



const AuthService = {
  
async login({ emailOrPhone, password, signupMethod }) {
  const t = await sequelize.transaction();

  try {
    const identifierField =
      signupMethod === "email" ? "email" : "phone_number";

    const user = await User.findOne({
      where: { [identifierField]: emailOrPhone },
      include: [
        {
          model: sequelize.models.RoleTag,
          as: "RoleTag",
          attributes: ["name"],
        },
      ],
      transaction: t,
    });

    if (!user) {
      await t.rollback(); // ← rollback early
      throwError("No account found.", 404);
    }

    const isSuperAdmin = user.RoleTag?.name === "super_admin";

    if (signupMethod === "email" && !isSuperAdmin && !user.email_verified_at) {
      await t.rollback();
      throwError("Email not confirmed.", 403);
    }

    if (signupMethod === "phone_number" && !isSuperAdmin && !user.phone_verified_at) {
      await t.rollback();
      throwError("Phone not confirmed.", 403);
    }

    if (user.isLocked()) {
      await t.rollback();
      const remainingMs = new Date(user.locked_until) - new Date();
      throwError(
        `Account locked. Try again in ${Math.ceil(remainingMs / 1000)} seconds.`,
        403
      );
    }

    const isMatched = await user.comparePassword(password);
    if (!isMatched) {
      // ← Update failed attempts INSIDE transaction
      await user.markFailedLoginAttempt(5, 5);
      await t.commit(); // ← Save failed attempt

      throwError(
        `Invalid credentials. ${5 - user.failed_login_attempts} attempts remaining.`,
        401
      );
    }

    // ← SUCCESS PATH ONLY
    await user.markSuccessfulLogin();
    await t.commit(); // ← Only commit on success

    const isCreatedUser = !!user.created_by;
    const hasChangedPassword = !!user.password_changed_at;

    if (isCreatedUser && !hasChangedPassword) {
      return {
        user,
        requiresPasswordChange: true,
        message: "Please change your temporary password before proceeding.",
      };
    }

    return { user, requiresPasswordChange: false };
  } catch (err) {
    // Only rollback if transaction is still active
    if (t.finished !== "commit" && t.finished !== "rollback") {
      await t.rollback();
    }
    throw err;
  }
},
  async changeTemporaryPassword({ userId, newPassword }) {
    const t = await sequelize.transaction();
    try {
      const user = await User.findByPk(userId, { transaction: t });

      if (!user) throwError("User not found", 404);

      if (!newPassword || newPassword.length < 6) {
        throwError("Password must be at least 6 characters long", 400);
      }

      await user.update(
        {
          password: newPassword,
          password_changed_at: new Date(),
        },
        { transaction: t }
      );

      await t.commit();
      await user.reload();

      return user;
    } catch (err) {
      await t.rollback();
      throw err;
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

  async forgotPassword({ emailOrPhone, signupMethod }) {
    if (!emailOrPhone || !signupMethod)
      throwError("Missing required fields", 400);

    const t = await sequelize.transaction();

    try {
      const identifierField =
        signupMethod === "email" ? "email" : "phone_number";

      const user = await User.findOne({
        where: { [identifierField]: { [Op.iLike]: emailOrPhone } },
        transaction: t,
      });
      if (!user) throwError("User not found.", 404);

      if (
        (signupMethod === "email" && !user.email_verified_at) ||
        (signupMethod === "phone_number" && !user.phone_verified_at)
      )
        throwError(`${signupMethod} not verified.`, 400);

      if (user.created_by && !user.password_changed_at) {
        throwError(
          "You must set a password before you can reset it. Please contact your admin.",
          400
        );
      }

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
      } else {
        await sendSMS(
          emailOrPhone,
          `Hi ${user.first_name}, your signup confirmation code is: ${confirmationCode}`
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

  async resendCode({ emailOrPhone, signupMethod }) {
    const t = await sequelize.transaction();
    try {
      const identifierField =
        signupMethod === "email" ? "email" : "phone_number";

      const user = await User.findOne({
        where: { [identifierField]: emailOrPhone },
        transaction: t,
      });

      if (!user) throwError("User not found.", 404);

      if (
        (signupMethod === "email" && !user.email_verified_at) ||
        (signupMethod === "phone_number" && !user.phone_verified_at)
      ) {
        throwError(`${signupMethod} not verified.`, 400);
      }

      if (user.created_by && !user.password_changed_at) {
        throwError(
          "You must set a password before you can reset it. Please contact your admin.",
          400
        );
      }

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
      } else {
        await sendSMS(
          emailOrPhone,
          `Hi ${user.first_name}, your signup confirmation code is: ${newCode}`
        );
      }

      await t.commit();
      return { message: "Verification code resent.", data: null };
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
          password_changed_at: new Date(),
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

  async verifyCode({ emailOrPhone, signupMethod, code }) {
    const t = await sequelize.transaction();
    try {
      const identifierField =
        signupMethod === "email" ? "email" : "phone_number";
      const user = await User.findOne({
        where: {
          [identifierField]: emailOrPhone,
          confirmation_code: code,
          confirmation_code_expires: { [Op.gt]: new Date() },
        },
        transaction: t,
      });

      if (!user) throwError("Invalid or expired code.", 400);

      const verifiedField =
        signupMethod === "email" ? "email_verified_at" : "phone_verified_at";

      await user.update(
        {
          confirmation_code: null,
          confirmation_code_expires: null,
          [verifiedField]: new Date(),
        },
        { transaction: t }
      );

      await t.commit();
      return { message: "Code Verified", data: null };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },
};

module.exports = AuthService;
