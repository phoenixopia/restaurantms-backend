"use strict";

const { User, Role } = require("../models/index");
const { v4: uuidv4 } = require("uuid");

module.exports = async () => {

  const superAdminRole = await Role.findOne({ where: { name: "super_admin" } });
  const now = new Date();

  await User.create({
    id: uuidv4(),
    first_name: "Super",
    last_name: "Admin",
    email: "superadmin@gmail.com",
    password: "1234567890",
    role_id: superAdminRole.id,
    is_active: true,
    email_verified_at: now,
    password_changed_at: now,
    created_at: now,
    updated_at: now,
  });
};
