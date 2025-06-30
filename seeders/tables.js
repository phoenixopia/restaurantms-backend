const {
  sequelize,
  Plan,
  Role,
  Permission,
  RolePermission,
} = require("../models");

(async () => {
  try {
    // Sync only the necessary tables
    await Plan.sync({ force: true });
    await Role.sync({ force: true });
    await Permission.sync({ force: true });
    await RolePermission.sync({ force: true });

    // Create Plans
    const plans = await Plan.bulkCreate([
      {
        name: "Basic",
        max_branches: 2,
        max_locations: 1,
        max_staff: 5,
        max_users: 10,
        max_kds: 2,
        kds_enabled: false,
        price: 29.99,
      },
      {
        name: "Pro",
        max_branches: 5,
        max_locations: 5,
        max_staff: 20,
        max_users: 50,
        max_kds: 5,
        kds_enabled: true,
        price: 99.99,
      },
      {
        name: "Enterprise",
        max_branches: 10,
        max_locations: 10,
        max_staff: 30,
        max_users: 100,
        max_kds: 10,
        kds_enabled: true,
        price: 149.99,
      },
    ]);
    console.log("✅ Plans created successfully");

    // Create Roles
    const roles = await Role.bulkCreate([
      { name: "super_admin", description: "Super administrator role" },
      { name: "admin", description: "Restaurant administrator role" },
      { name: "customer", description: "Customer role" },
      { name: "staff", description: "Staff member role" },
    ]);
    const roleMap = {};
    roles.forEach((role) => (roleMap[role.name] = role.id));
    console.log("✅ Roles created successfully");

    // Create Permissions
    const permissions = await Permission.bulkCreate([
      // System permissions
      { name: "manage_users", description: "Can manage users" },
      { name: "manage_roles", description: "Can manage roles" },
      { name: "manage_permissions", description: "Can manage permissions" },

      // Restaurant management permissions
      {
        name: "manage_restaurant",
        description: "Can manage restaurant settings",
      },
      { name: "manage_branches", description: "Can manage branches" },
      { name: "manage_subscription", description: "Can manage subscription" },

      // Menu permissions
      { name: "view_menu", description: "Can view menu" },
      { name: "create_menu", description: "Can create menu" },
      { name: "edit_menu", description: "Can edit menu" },
      { name: "delete_menu", description: "Can delete menu" },

      // Menu category permissions
      { name: "view_menu_category", description: "Can view menu categories" },
      {
        name: "create_menu_category",
        description: "Can create menu categories",
      },
      { name: "edit_menu_category", description: "Can edit menu categories" },
      {
        name: "delete_menu_category",
        description: "Can delete menu categories",
      },

      // Menu item permissions
      { name: "view_menu_item", description: "Can view menu items" },
      { name: "create_menu_item", description: "Can create menu items" },
      { name: "edit_menu_item", description: "Can edit menu items" },
      { name: "delete_menu_item", description: "Can delete menu items" },

      // Order permissions
      { name: "view_orders", description: "Can view orders" },
      { name: "create_order", description: "Can create orders" },
      { name: "edit_order", description: "Can edit orders" },
      { name: "delete_order", description: "Can delete orders" },

      // Order item permissions
      { name: "view_order_item", description: "Can view order items" },
      { name: "create_order_item", description: "Can create order items" },
      { name: "edit_order_item", description: "Can edit order items" },
      { name: "delete_order_item", description: "Can delete order items" },
    ]);
    const permissionMap = {};
    permissions.forEach((p) => (permissionMap[p.name] = p.id));
    console.log("✅ Permissions created successfully");

    // Assign permissions to roles
    await RolePermission.bulkCreate([
      // Super Admin gets all permissions
      ...Object.values(permissionMap).map((permissionId) => ({
        role_id: roleMap["super_admin"],
        permission_id: permissionId,
        granted: true,
      })),

      // Restaurant Admin permissions
      {
        role_id: roleMap["admin"],
        permission_id: permissionMap["manage_restaurant"],
        granted: true,
      },
      {
        role_id: roleMap["admin"],
        permission_id: permissionMap["manage_branches"],
        granted: true,
      },
      {
        role_id: roleMap["admin"],
        permission_id: permissionMap["manage_subscription"],
        granted: true,
      },
      {
        role_id: roleMap["admin"],
        permission_id: permissionMap["view_menu"],
        granted: true,
      },
      {
        role_id: roleMap["admin"],
        permission_id: permissionMap["create_menu"],
        granted: true,
      },
      {
        role_id: roleMap["admin"],
        permission_id: permissionMap["edit_menu"],
        granted: true,
      },
      {
        role_id: roleMap["admin"],
        permission_id: permissionMap["delete_menu"],
        granted: true,
      },
      {
        role_id: roleMap["admin"],
        permission_id: permissionMap["view_menu_category"],
        granted: true,
      },
      {
        role_id: roleMap["admin"],
        permission_id: permissionMap["create_menu_category"],
        granted: true,
      },
      {
        role_id: roleMap["admin"],
        permission_id: permissionMap["edit_menu_category"],
        granted: true,
      },
      {
        role_id: roleMap["admin"],
        permission_id: permissionMap["delete_menu_category"],
        granted: true,
      },
      {
        role_id: roleMap["admin"],
        permission_id: permissionMap["view_menu_item"],
        granted: true,
      },
      {
        role_id: roleMap["admin"],
        permission_id: permissionMap["create_menu_item"],
        granted: true,
      },
      {
        role_id: roleMap["admin"],
        permission_id: permissionMap["edit_menu_item"],
        granted: true,
      },
      {
        role_id: roleMap["admin"],
        permission_id: permissionMap["delete_menu_item"],
        granted: true,
      },
      {
        role_id: roleMap["admin"],
        permission_id: permissionMap["view_orders"],
        granted: true,
      },
      {
        role_id: roleMap["admin"],
        permission_id: permissionMap["create_order"],
        granted: true,
      },
      {
        role_id: roleMap["admin"],
        permission_id: permissionMap["edit_order"],
        granted: true,
      },
      {
        role_id: roleMap["admin"],
        permission_id: permissionMap["delete_order"],
        granted: true,
      },
      {
        role_id: roleMap["admin"],
        permission_id: permissionMap["view_order_item"],
        granted: true,
      },
      {
        role_id: roleMap["admin"],
        permission_id: permissionMap["create_order_item"],
        granted: true,
      },
      {
        role_id: roleMap["admin"],
        permission_id: permissionMap["edit_order_item"],
        granted: true,
      },
      {
        role_id: roleMap["admin"],
        permission_id: permissionMap["delete_order_item"],
        granted: true,
      },
    ]);
    console.log("✅ Role permissions assigned successfully");

    console.log("✅ All seed data added successfully.");
  } catch (error) {
    console.error("❌ Error seeding data:", error);
  } finally {
    await sequelize.close();
  }
})();
