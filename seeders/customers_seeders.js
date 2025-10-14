"use strict";

const { Customer, Role, RoleTag } = require("../models");
const { v4: uuidv4 } = require("uuid");

module.exports = async () => {
  const now = new Date();

  const customerRoleTag = await RoleTag.findOne({
    where: { name: "customer" },
  });
  const customerRole = await Role.findOne({ where: { name: "Customer" } });

  if (!customerRoleTag || !customerRole) {
    throw new Error(
      "Customer role or role_tag not found. Please seed roles first."
    );
  }

  const customerData = [
    {
      id: uuidv4(),
      first_name: "customer",
      last_name: "one",
      email: "customer1@gmail.com",
      password: "1234567890",
      profile_picture:
        "https://static.vecteezy.com/system/resources/previews/002/002/403/non_2x/man-with-beard-avatar-character-isolated-icon-free-vector.jpg",
      dob: new Date(1990, 0, 1),
      email_verified_at: now,
      role_id: customerRole.id,
      role_tag_id: customerRoleTag.id,
      created_at: now,
      updated_at: now,
    },
    {
      id: uuidv4(),
      first_name: "customer",
      last_name: "two",
      email: "customer2@gmail.com",
      password: "1234567890",
      profile_picture:
        "https://img.freepik.com/premium-vector/avatar-profile-icon-flat-style-female-user-profile-vector-illustration-isolated-background-women-profile-sign-business-concept_157943-38866.jpg",
      dob: new Date(1991, 1, 2),
      email_verified_at: now,
      role_id: customerRole.id,
      role_tag_id: customerRoleTag.id,
      created_at: now,
      updated_at: now,
    },
    {
      id: uuidv4(),
      first_name: "customer",
      last_name: "three",
      email: "customer3@gmail.com",
      password: "1234567890",
      profile_picture: "https://randomuser.me/api/portraits/men/3.jpg",
      dob: new Date(1992, 2, 3),
      email_verified_at: now,
      role_id: customerRole.id,
      role_tag_id: customerRoleTag.id,
      created_at: now,
      updated_at: now,
    },
    {
      id: uuidv4(),
      first_name: "customer",
      last_name: "four",
      email: "customer4@gmail.com",
      password: "1234567890",
      profile_picture: "https://randomuser.me/api/portraits/women/4.jpg",
      dob: new Date(1993, 3, 4),
      email_verified_at: now,
      role_id: customerRole.id,
      role_tag_id: customerRoleTag.id,
      created_at: now,
      updated_at: now,
    },
  ];

  await Customer.bulkCreate(customerData, {
    individualHooks: true,
  });

  console.log("✅ 4 Customers seeded successfully");
};
