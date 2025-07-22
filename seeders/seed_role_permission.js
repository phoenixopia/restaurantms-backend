const { Role, RolePermission, Permission } = require("../models");

module.exports = async () => {
  const roles = await Role.findAll();
  const permissions = await Permission.findAll();

  const roleMap = {};
  roles.forEach((role) => (roleMap[role.name] = role.id));

  const permissionMap = {};
  permissions.forEach((p) => (permissionMap[p.name] = p.id));

  const rolePermissions = [];

  // Super Admin gets everything
  for (const permissionId of Object.values(permissionMap)) {
    rolePermissions.push({
      role_id: roleMap.super_admin,
      permission_id: permissionId,
      granted: true,
    });
  }

  // Restaurant Admin limited
  const allowed = [
    "manage_users",
    "assign_permissions",
    "manage_restaurant",
    "view_branch",
    "manage_branches",
    "manage_subscription",
    "view_menu",
    "create_menu",
    "edit_menu",
    "delete_menu",
    "toggle_menu_activation",
    "view_menu_category",
    "create_menu_category",
    "edit_menu_category",
    "delete_menu_category",
    "toggle_menu_category_activation",
    "view_menu_item",
    "create_menu_item",
    "edit_menu_item",
    "delete_menu_item",
    "toggle_menu_item_activation",
    "upload_video",
  ];

  for (const perm of allowed) {
    rolePermissions.push({
      role_id: roleMap.restaurant_admin,
      permission_id: permissionMap[perm],
      granted: true,
    });
  }

  await RolePermission.bulkCreate(rolePermissions);
  console.log("✅ Role permissions seeded");
};
