"use strict";

const { User, Branch, Role } = require("../models");
const { v4: uuidv4 } = require("uuid");

module.exports = async () => {
  const now = new Date();

  const staffRole = await Role.findOne({ where: { name: "staff" } });
  const branches = await Branch.findAll();

  const staffNames = ["One", "Two", "Three"];
  const staffEmails = branches.flatMap((branch, index) => [
    `staff1_${index}@branch.com`,
    `staff2_${index}@branch.com`,
    `staff3_${index}@branch.com`,
  ]);

  let emailIndex = 0;
  for (const branch of branches) {
    for (let i = 0; i < staffNames.length; i++) {
      await User.create({
        id: uuidv4(),
        first_name: "Staff",
        last_name: staffNames[i],
        email: staffEmails[emailIndex++],
        password: "1234567890",
        role_id: staffRole.id,
        branch_id: branch.id,
        is_active: true,
        created_at: now,
        updated_at: now,
      });
    }
  }
};
