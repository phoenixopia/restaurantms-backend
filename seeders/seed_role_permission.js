// seeders/seed_role_permissions.js
"use strict";

const { Role, RolePermission, Permission } = require("../models");
const { v4: uuidv4 } = require("uuid");

module.exports = async () => {
  const roles = await Role.findAll();
  const permissions = await Permission.findAll();

  const superAdminRole = roles.find((r) => r.name === "Super Administrator");
  const restaurantAdminRole = roles.find(
    (r) => r.name === "Restaurant Administrator"
  );

  if (!superAdminRole || !restaurantAdminRole) {
    throw new Error(
      "Super admin or restaurant admin role not found. Please seed roles first."
    );
  }

  // Permissions to exclude for restaurant admin (RBAC management)
  const excludedPermissionsForRestaurantAdmin = [
    "create_role_tag",
    "update_role_tag",
    "view_role_tag",
    "delete_role_tag",
    "create_permission",
    "update_permission",
  ];

  const rolePermissions = [];

  // Grant all permissions to super admin
  permissions.forEach((permission) => {
    rolePermissions.push({
      id: uuidv4(),
      role_id: superAdminRole.id,
      permission_id: permission.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  // Grant only allowed permissions to restaurant admin
  permissions.forEach((permission) => {
    if (!excludedPermissionsForRestaurantAdmin.includes(permission.name)) {
      rolePermissions.push({
        id: uuidv4(),
        role_id: restaurantAdminRole.id,
        permission_id: permission.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  });

  await RolePermission.bulkCreate(rolePermissions);

  console.log("✅ Role-permission assignments seeded successfully");
};
