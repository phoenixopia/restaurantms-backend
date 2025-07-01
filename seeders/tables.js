const {
  sequelize,
  Plan,
  Role,
  Permission,
  RolePermission,
  CategoryTag,
} = require("../models");
const { v4: uuidv4 } = require("uuid");

(async () => {
  try {
    // Sync only the necessary tables
    await Plan.sync({ force: true });
    await Role.sync({ force: true });
    await Permission.sync({ force: true });
    await RolePermission.sync({ force: true });
    await CategoryTag.sync({ force: true });

    // Create Plans
    await Plan.bulkCreate([
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
    console.log("✅ Plans created");

    // Create Roles
    const roles = await Role.bulkCreate([
      { name: "super_admin", description: "Super administrator role" },
      {
        name: "restaurant_admin",
        description: "Restaurant administrator role",
      },
      { name: "customer", description: "Customer role" },
      { name: "staff", description: "Staff member role" },
    ]);
    const roleMap = {};
    roles.forEach((role) => (roleMap[role.name] = role.id));
    console.log("✅ Roles created");

    // Create Permissions
    const permissions = await Permission.bulkCreate([
      { name: "manage_users", description: "Can manage users" },
      { name: "manage_roles", description: "Can manage roles" },
      { name: "manage_permissions", description: "Can manage permissions" },
      { name: "assign_permissions", description: "Can assign permissions" },
      {
        name: "manage_restaurant",
        description: "Can manage restaurant settings",
      },
      { name: "manage_branches", description: "Can manage branches" },
      { name: "manage_subscription", description: "Can manage subscription" },
      { name: "view_menu", description: "Can view menu" },
      { name: "create_menu", description: "Can create menu" },
      { name: "edit_menu", description: "Can edit menu" },
      { name: "delete_menu", description: "Can delete menu" },
      {
        name: "toggle_menu_activation",
        description: "Can toggle menu activation",
      },
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
      {
        name: "toggle_menu_category_activation",
        description: "Can toggle menu category activation",
      },
      { name: "view_menu_item", description: "Can view menu items" },
      { name: "create_menu_item", description: "Can create menu items" },
      { name: "edit_menu_item", description: "Can edit menu items" },
      { name: "delete_menu_item", description: "Can delete menu items" },
      {
        name: "toggle_menu_item_activation",
        description: "Can toggle menu item activation",
      },
    ]);
    const permissionMap = {};
    permissions.forEach((p) => (permissionMap[p.name] = p.id));
    console.log("✅ Permissions created");

    // Assign permissions to roles
    await RolePermission.bulkCreate([
      ...Object.values(permissionMap).map((permissionId) => ({
        role_id: roleMap["super_admin"],
        permission_id: permissionId,
        granted: true,
      })),
      {
        role_id: roleMap["restaurant_admin"],
        permission_id: permissionMap["manage_users"],
        granted: true,
      },
      {
        role_id: roleMap["restaurant_admin"],
        permission_id: permissionMap["assign_permissions"],
        granted: true,
      },
      {
        role_id: roleMap["restaurant_admin"],
        permission_id: permissionMap["manage_restaurant"],
        granted: true,
      },
      {
        role_id: roleMap["restaurant_admin"],
        permission_id: permissionMap["manage_branches"],
        granted: true,
      },
      {
        role_id: roleMap["restaurant_admin"],
        permission_id: permissionMap["manage_subscription"],
        granted: true,
      },
      {
        role_id: roleMap["restaurant_admin"],
        permission_id: permissionMap["view_menu"],
        granted: true,
      },
      {
        role_id: roleMap["restaurant_admin"],
        permission_id: permissionMap["create_menu"],
        granted: true,
      },
      {
        role_id: roleMap["restaurant_admin"],
        permission_id: permissionMap["edit_menu"],
        granted: true,
      },
      {
        role_id: roleMap["restaurant_admin"],
        permission_id: permissionMap["delete_menu"],
        granted: true,
      },
      {
        role_id: roleMap["restaurant_admin"],
        permission_id: permissionMap["toggle_menu_activation"],
        granted: true,
      },
      {
        role_id: roleMap["restaurant_admin"],
        permission_id: permissionMap["view_menu_category"],
        granted: true,
      },
      {
        role_id: roleMap["restaurant_admin"],
        permission_id: permissionMap["create_menu_category"],
        granted: true,
      },
      {
        role_id: roleMap["restaurant_admin"],
        permission_id: permissionMap["edit_menu_category"],
        granted: true,
      },
      {
        role_id: roleMap["restaurant_admin"],
        permission_id: permissionMap["delete_menu_category"],
        granted: true,
      },
      {
        role_id: roleMap["restaurant_admin"],
        permission_id: permissionMap["toggle_menu_category_activation"],
        granted: true,
      },
      {
        role_id: roleMap["restaurant_admin"],
        permission_id: permissionMap["view_menu_item"],
        granted: true,
      },
      {
        role_id: roleMap["restaurant_admin"],
        permission_id: permissionMap["create_menu_item"],
        granted: true,
      },
      {
        role_id: roleMap["restaurant_admin"],
        permission_id: permissionMap["edit_menu_item"],
        granted: true,
      },
      {
        role_id: roleMap["restaurant_admin"],
        permission_id: permissionMap["delete_menu_item"],
        granted: true,
      },
      {
        role_id: roleMap["restaurant_admin"],
        permission_id: permissionMap["toggle_menu_item_activation"],
        granted: true,
      },
    ]);
    console.log("✅ Role permissions assigned");

    // ✅ Add Category Tags
    const categoryNames = [
      "Drinks",
      "Hot Drinks",
      "Cold Drinks",
      "Breakfast",
      "Lunch",
      "Dinner",
      "Snacks",
      "Fast Food",
      "Burgers & Sandwiches",
      "Pizza",
      "Main Dishes",
      "Sides",
      "Salads",
      "Soups",
      "Desserts",
      "Kids Meals",
      "Specials",
    ];

    const categoryTags = categoryNames.map((name) => ({
      id: uuidv4(),
      name,
    }));

    await sequelize
      .getQueryInterface()
      .bulkInsert("category_tags", categoryTags);
    console.log("✅ Category tags seeded");

    console.log("🎉 All seed data inserted successfully.");
  } catch (error) {
    console.error("❌ Error during seed:", error);
  } finally {
    await sequelize.close();
  }
})();
