"use strict";
require("dotenv").config();
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const { User, Role, UserRole } = require("../../models");
const { where } = require("sequelize");

const register = async (req, res) => {
  try {
    const { name, email, phone_number, password } = req.body;
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { phone_number }],
      },
    });
    if (existingUser) {
      return res.status(400).json({
        status: "error",
        message: "User already exists",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      phone_number,
      password_hash: hashedPassword,
      is_active: true,
      two_factor_enabled: false,
      social_provider: "None",
    });
    let customerRole = await Role.findOne({
      where: { name: "customer" },
    });
    if (!customerRole) {
      customerRole = await Role.create({
        id: uuidv4(),
        name: "customer",
        description: "Customer with limited permissions",
      });
    }
    await UserRole.create({
      id: uuidv4(),
      user_id: user.id,
      role_id: customerRole.id,
      restaurant_id: null,
    });
    return res.status(201).json({
      message: "Signup successful",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }
    await user.update({ last_login_at: new Date() });
    const userRole = await UserRole.findOne({
      where: { user_id: user.id },
      include: [{ model: Role }],
    });
    let roleName = "unknown";
    if (userRole && userRole.Role) {
      roleName = userRole.Role.name;
    }
    const token = jwt.sign(
      { id: user.id, role: roleName },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    return res.status(200).json({
      message: "Login successful",
      token,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

module.exports = {
  register,
  login,
};
