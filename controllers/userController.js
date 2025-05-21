// userController.js
"use strict";
const { User, sequelize } = require("../models");
const { capitalizeFirstLetter } = require("../utils/capitalizeFirstLetter");

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findOne({
      where: { id: req.user.id },
      attributes: { exclude: ["password", "resetToken", "confirmationCode"] },
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("Get Profile Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error." });
  }
};
exports.updateProfile = async (req, res) => {
  const { firstName, lastName, phoneNumber } = req.body;

  if (!firstName && !lastName && !phoneNumber) {
    return res.status(400).json({
      success: false,
      message:
        "At least one field (firstName, lastName, phoneNumber) must be provided for update.",
    });
  }

  const t = await sequelize.transaction();
  try {
    const user = await User.findByPk(req.user.id, { transaction: t });

    if (!user) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    if (firstName) user.firstName = capitalizeFirstLetter(firstName);
    if (lastName) user.lastName = capitalizeFirstLetter(lastName);
    if (phoneNumber) user.phoneNumber = phoneNumber;

    await user.save({ transaction: t });
    await t.commit();

    const updatedUser = await User.findByPk(user.id, {
      attributes: { exclude: ["password", "resetToken", "confirmationCode"] },
    });

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: updatedUser,
    });
  } catch (error) {
    await t.rollback();
    console.error("Update Profile Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error." });
  }
};
exports.deleteAccount = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const user = await User.findOne({
      where: { id: req.user.id },
      transaction: t,
    });
    if (!user) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    await user.destroy({ transaction: t });
    await t.commit();

    res.clearCookie("token");
    req.headers["authorization"] = "";
    return res
      .status(200)
      .json({ success: true, message: "Account deleted successfully." });
  } catch (error) {
    await t.rollback();
    console.error("Delete Account Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error." });
  }
};
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const t = await sequelize.transaction();
  try {
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }

    const user = await User.findOne({
      where: { id: req.user.id },
      attributes: { include: ["password"] },
      transaction: t,
    });

    if (!user) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      await t.rollback();
      return res
        .status(401)
        .json({ success: false, message: "Current password is incorrect." });
    }

    user.password = newPassword;
    await user.save({ transaction: t });
    await t.commit();

    return res
      .status(200)
      .json({ success: true, message: "Password changed successfully." });
  } catch (error) {
    await t.rollback();
    console.error("Change Password Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error." });
  }
};
