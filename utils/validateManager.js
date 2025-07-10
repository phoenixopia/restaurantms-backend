"use strict";

const { User, Role } = require("../models");
const throwError = require("../utils/throwError");

async function validateManagerById(managerId, adminId, transaction = null) {
  if (!managerId) {
    throwError("Manager ID is required");
  }

  const manager = await User.findByPk(managerId, {
    include: [{ model: Role, attributes: ["name"] }],
    transaction,
  });

  if (!manager) {
    throwError("Manager not found", 404);
  }

  if (!manager.Role || manager.Role.name !== "staff") {
    throwError("User is not a staff (branch manager)", 400);
  }

  if (manager.created_by !== adminId) {
    throwError("You can only assign managers you have created", 403);
  }

  return manager;
}

module.exports = { validateManagerById };
