"use strict";

const { v4: uuidv4 } = require("uuid");

const now = new Date();

module.exports = async () => {
  const { User, Role, RoleTag } = require("../models");

  const roleTags = await RoleTag.bulkCreate([
    {
      id: uuidv4(),
      name: "super_admin",
      description:
        "Has full access to all system features and administrative controls.",
    },
    {
      id: uuidv4(),
      name: "restaurant_admin",
      description: "Manages restaurant settings, staff, and menu operations.",
    },
    {
      id: uuidv4(),
      name: "staff",
      description:
        "Handles daily restaurant operations like order processing and customer service.",
    },
    {
      id: uuidv4(),
      name: "customer",
      description:
        "Can browse menus, place orders, and access personal account features.",
    },
  ]);

  const superAdminRoleTag = roleTags.find((tag) => tag.name === "super_admin");
  const restaurantAdminRoleTag = roleTags.find(
    (tag) => tag.name === "restaurant_admin"
  );
  const customerRoleTag = roleTags.find((tag) => tag.name === "customer");

  const tempUser = await User.create({
    id: uuidv4(),
    first_name: "Temp",
    last_name: "User",
    email: "tempuser@example.com",
    password: "12345678",
    role_id: null,
    role_tag_id: superAdminRoleTag.id,
    is_active: true,
    email_verified_at: now,
    password_changed_at: now,
  });

  const superAdminRole = await Role.create({
    id: uuidv4(),
    name: "Super Administrator",
    role_tag_id: superAdminRoleTag.id,
    description: "System super administrator with all permissions",
    created_by: tempUser.id,
  });

  const superAdminUser = await User.create({
    id: uuidv4(),
    first_name: "Super",
    last_name: "Admin",
    email: "superadmin@gmail.com",
    password: "1234567890",
    role_id: superAdminRole.id,
    role_tag_id: superAdminRoleTag.id,
    is_active: true,
    email_verified_at: now,
    password_changed_at: now,
  });

  const restaurantAdminRole = await Role.create({
    id: uuidv4(),
    name: "Restaurant Administrator",
    role_tag_id: restaurantAdminRoleTag.id,
    description: "Administrator role for managing restaurant operations",
    created_by: superAdminUser.id,
  });

  const customerRole = await Role.create({
    id: uuidv4(),
    name: "Customer",
    role_tag_id: customerRoleTag.id,
    description: "Role for regular customers",
    created_by: superAdminUser.id,
  });

  await superAdminRole.update({ created_by: superAdminUser.id });

  // Delete temp user
  await tempUser.destroy();

  console.log(`
✅ Seeding completed successfully:
`);
};
