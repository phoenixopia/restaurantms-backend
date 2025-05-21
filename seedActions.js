const { v4: uuidv4 } = require("uuid");
const { Role, Permission, RolePermission, sequelize } = require("./models");

const now = new Date();

const generateRole = (name, description) => ({
  id: uuidv4(),
  name,
  description,
  created_at: now,
  updated_at: now,
});

const generatePermission = (name, description) => ({
  id: uuidv4(),
  name,
  description,
  created_at: now,
  updated_at: now,
});

// Seed Roles
async function seedRoles() {
  const rolesData = [
    generateRole("super_admin", "System-wide super administrator"),
    generateRole("restaurant_admin", "Admin of the restaurant"),
    generateRole("manager", "Restaurant manager with extended rights"),
    generateRole("cashier", "Handles payment and transactions"),
    generateRole("waiter", "Handles customer orders on site"),
    generateRole("staff", "Staff role for future use"),
    generateRole("customer", "Mobile/website customer"),
    generateRole("chef", "Responsible for preparing food"),
  ];

  await sequelize.transaction(async (t) => {
    await Role.destroy({
      where: {},
      truncate: true,
      cascade: true,
      transaction: t,
    });
    await Role.bulkCreate(rolesData, { transaction: t });
  });
}

// Seed Permissions
async function seedPermissions() {
  const permissionsData = [
    generatePermission("view_restaurant_profile", "View restaurant profile"),
    generatePermission("edit_restaurant_profile", "Edit restaurant profile"),
    generatePermission("manage_subscription", "Manage restaurant subscription"),
    generatePermission("view_analytics", "View analytics"),
    generatePermission("view_staff", "View all staff members"),
    generatePermission("add_staff", "Add new staff"),
    generatePermission("edit_staff", "Edit staff info or role"),
    generatePermission("remove_staff", "Delete staff accounts"),
    generatePermission("assign_staff_permission", "Assign permission to staff"),
    generatePermission("view_menu_items", "View all menu items"),
    generatePermission("add_menu_item", "Add a menu item"),
    generatePermission("edit_menu_item", "Edit a menu item"),
    generatePermission("delete_menu_item", "Delete a menu item"),
    generatePermission("manage_menu_category", "Manage menu categories"),
    generatePermission("view_orders", "View orders"),
    generatePermission("manage_orders", "Accept, prepare, or complete orders"),
    generatePermission("cancel_orders", "Cancel active orders"),
    generatePermission("view_transactions", "View all transactions"),
    generatePermission("view_earnings_summary", "See restaurant earnings"),
    generatePermission("view_roles", "View roles"),
    generatePermission("assign_roles", "Assign user roles"),
    generatePermission("edit_roles", "Edit restaurant roles"),
    generatePermission("manage_permissions", "Manage role permissions"),
    generatePermission("view_feedback", "View customer feedback"),
    generatePermission("respond_feedback", "Respond to feedback"),
    generatePermission("delete_feedback", "Moderate feedback"),
    generatePermission("manage_notifications", "Manage notification settings"),
    generatePermission("update_settings", "Edit restaurant settings"),
    generatePermission(
      "manage_all_restaurants",
      "Super admin: manage all restaurants"
    ),
    generatePermission(
      "manage_global_roles",
      "Super admin: manage system roles"
    ),
    generatePermission(
      "access_system_logs",
      "Super admin: access backend logs"
    ),
  ];

  await sequelize.transaction(async (t) => {
    await Permission.destroy({
      where: {},
      truncate: true,
      cascade: true,
      transaction: t,
    });
    await Permission.bulkCreate(permissionsData, { transaction: t });
  });
}

// Seed RolePermissions
async function seedRolePermissions() {
  const roles = await Role.findAll();
  const permissions = await Permission.findAll();

  const roleMap = {};
  const permissionMap = {};
  roles.forEach((r) => (roleMap[r.name] = r.id));
  permissions.forEach((p) => (permissionMap[p.name] = p.id));

  const assignPermissions = (roleName, permNames) => {
    return permNames
      .filter((perm) => permissionMap[perm])
      .map((permName) => ({
        id: uuidv4(),
        role_id: roleMap[roleName],
        permission_id: permissionMap[permName],
        granted: true,
        created_at: now,
        updated_at: now,
      }));
  };

  const rolePermissionsData = [
    // super_admin gets all permissions
    ...assignPermissions("super_admin", Object.keys(permissionMap)),

    // restaurant_admin
    ...assignPermissions("restaurant_admin", [
      "manage_subscription",
      "view_restaurant_profile",
      "edit_restaurant_profile",
      "view_staff",
      "add_staff",
      "edit_staff",
      "remove_staff",
      "assign_staff_permission",
      "view_menu_items",
      "add_menu_item",
      "edit_menu_item",
      "delete_menu_item",
      "manage_menu_category",
      "view_orders",
      "manage_orders",
      "cancel_orders",
      "view_transactions",
      "view_earnings_summary",
      "view_roles",
      "assign_roles",
      "edit_roles",
      "manage_permissions",
      "view_feedback",
      "respond_feedback",
      "delete_feedback",
      "manage_notifications",
      "update_settings",
    ]),

    // manager
    ...assignPermissions("manager", [
      "view_orders",
      "manage_orders",
      "view_staff",
      "view_menu_items",
      "manage_menu_category",
      "view_feedback",
    ]),

    // cashier
    ...assignPermissions("cashier", [
      "view_orders",
      "manage_orders",
      "view_transactions",
      "view_earnings_summary",
    ]),

    // chef
    ...assignPermissions("chef", ["view_orders", "manage_orders"]),

    // waiter
    ...assignPermissions("waiter", ["view_orders"]),

    // customer
    ...assignPermissions("customer", [
      "view_restaurant_profile",
      "view_menu_items",
      "view_orders",
    ]),
    // staff (no permissions for now, placeholder)
    ...assignPermissions("staff", []),
  ];

  await sequelize.transaction(async (t) => {
    await RolePermission.destroy({
      where: {},
      truncate: true,
      cascade: true,
      transaction: t,
    });
    await RolePermission.bulkCreate(rolePermissionsData, { transaction: t });
  });
}

module.exports = {
  seedRoles,
  seedPermissions,
  seedRolePermissions,
};
