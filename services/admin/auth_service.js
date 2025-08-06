"use strict";

const { Op } = require("sequelize");
const throwError = require("../../utils/throwError");
const { User, sequelize } = require("../../models");
const {
  sendConfirmationEmail,
  sendPasswordResetEmail,
} = require("../../utils/sendEmail");
const { forgotPassword } = require("../customer/auth_service");

const AuthService = {
  async login({ emailOrPhone, password, signupMethod }) {
    const t = await sequelize.transaction();

    try {
      const identifierField =
        signupMethod === "email" ? "email" : "phone_number";

      const user = await User.findOne({
        where: { [identifierField]: emailOrPhone },
        transaction: t,
      });

      if (!user) throwError("No account found.", 404);

      if (signupMethod === "email" && !user.email_verified_at)
        throwError("Email not confirmed.", 403);

      if (signupMethod === "phone_number" && !user.phone_verified_at)
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

      await user.markSuccessfulLogin();

      const isCreatedUser = !!user.created_by;
      const hasChangedPassword = !!user.password_changed_at;

      await t.commit();

      if (isCreatedUser && !hasChangedPassword) {
        return {
          user,
          requiresPasswordChange: true,
          message: "Please change your temporary password before proceeding.",
        };
      }

      return { user, requiresPasswordChange: false };
    } catch (err) {
      await t.rollback();
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
};

module.exports = AuthService;
