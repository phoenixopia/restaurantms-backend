"use strict";

const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const now = new Date();

module.exports = async () => {
  const {
    User,
    Role,
    Permission,
    RoleTag,
    RolePermission,
  } = require("../models");

  const roleTags = await RoleTag.bulkCreate([
    {
      name: "super_admin",
      description: "System super administrator with all permissions",
    },
    {
      name: "restaurant_admin",
      description: "Administrator for a specific restaurant",
    },
    { name: "staff", description: "Staff member of a restaurant" },
    { name: "customer", description: "Regular customer user" },
    { name: "other", description: "Other type of user" },
  ]);

  const superAdminRoleTag = roleTags.find((tag) => tag.name === "super_admin");

  const tempUser = await User.create({
    id: uuidv4(),
    first_name: "Temp",
    last_name: "User",
    email: "tempuser@example.com",
    password: await bcrypt.hash("tempPass123", 10),
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

  const permissions = await Permission.bulkCreate([
    {
      name: "create_role_tag",
      description: "Permission to create new role tags",
    },
    {
      name: "update_role_tag",
      description: "Permission to update existing role tags",
    },
    { name: "view_role_tag", description: "Permission to view role tags" },
    { name: "delete_role_tag", description: "Permission to delete role tags" },
    { name: "create_role", description: "Permission to create new roles" },
    { name: "update_role", description: "Permission to update existing roles" },
    { name: "view_role", description: "Permission to view roles" },
    {
      name: "create_permission",
      description: "Permission to create new permissions",
    },
    {
      name: "update_permission",
      description: "Permission to update existing permissions",
    },
    { name: "view_permission", description: "Permission to view permissions" },

    {
      name: "view_restaurant",
      description: "Permission to view restaurant information",
    },
    {
      name: "update_restaurant",
      description: "Permission to update restaurant information",
    },

    {
      name: "add_contact_info",
      description: "Permission to add contact information",
    },
    {
      name: "view_contact_info",
      description: "Permission to view contact information",
    },
    {
      name: "update_contact_info",
      description: "Permission to update contact information",
    },
    {
      name: "delete_contact_info",
      description: "Permission to delete contact information",
    },
  ]);

  await RolePermission.bulkCreate(
    permissions.map((permission) => ({
      id: uuidv4(),
      role_id: superAdminRole.id,
      permission_id: permission.id,
    }))
  );

  const superAdminUser = await User.create({
    id: uuidv4(),
    first_name: "Super",
    last_name: "Admin",
    email: "natikeleme1@gmail.com",
    password: "12345678",
    role_id: superAdminRole.id,
    role_tag_id: superAdminRoleTag.id,
    is_active: true,
    email_verified_at: now,
    password_changed_at: now,
  });

  await superAdminRole.update({ created_by: superAdminUser.id });

  await tempUser.destroy();

  console.log(
    "✅ Roles, permissions, and super admin user seeded successfully"
  );
};
