const {
  sequelize,
  User,
  Role,
  Permission,
  RolePermission,
  Plan,
  Restaurant,
  Subscription,
} = require("../models/index");
const image =
  "https://drive.google.com/uc?id=1pMGXklJAHoz9YkE1udmLOLCofJhh9SPW";

(async () => {
  try {
    // Sync all relevant tables
    // await sequelize.sync({ force: true }); // WARNING: This drops all tables

    await Plan.sync({ force: true });
    await Subscription.sync({ force: true });
    await Role.sync({ force: true });
    await Restaurant.sync({ force: true });
    await User.sync({ force: true });
    await RestaurantUser.sync({ force: true });
    await Permission.sync({ force: true });
    await RolePermission.sync({ force: true });
    await RestaurantUser.sync({ force: true });

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
    const planMap = {};
    plans.forEach((plan) => (planMap[plan.name] = plan.id));

    // Create Subscription
    const subscription = await Subscription.create({
      plan_id: planMap["Basic"],
      start_date: new Date(),
      end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      billing_provider: "cash",
      billing_cycle: "monthly",
      status: "active",
    });

    // Create Restaurant
    const restaurant = await Restaurant.create({
      subscription_id: subscription.id,
      name: "Phoenixopia",
      logo_url: image,
      primary_color: "#FF5733",
      language: "en",
      rtl_enabled: false,
      status: "active",
    });

    // Create Roles
    const roles = await Role.bulkCreate([
      { name: "super_admin", description: "Super administrator role" },
      { name: "admin", description: "Admin of a restaurant" },
      { name: "customer", description: "Customer role" },
      { name: "staff", description: "Staff member of a restaurant" },
    ]);

    const roleMap = {};
    roles.forEach((role) => (roleMap[role.name] = role.id));

    // Step 2: Create Permissions (optional)
    const permissions = await Permission.bulkCreate([
      { name: "manage_users", description: "Can manage users" },
      { name: "manage_roles", description: "Can manage roles" },
      { name: "manage_permissions", description: "Can manage permissions" },
      { name: "view_orders", description: "Can view orders" },
      { name: "view_menu", description: "Can create menu" },
      { name: "view_order_item", description: "Can create order item" },
      { name: "view_menu_item", description: "Can create menu item" },
      { name: "view_menu_category", description: "Can create menu category" },
      { name: "create_order", description: "Can create order" },
      { name: "create_menu", description: "Can create menu" },
      { name: "create_order_item", description: "Can create order item" },
      { name: "create_menu_item", description: "Can create menu item" },
      { name: "create_menu_category", description: "Can create menu category" },
      { name: "edit_menu", description: "Can edit restaurant menu" },
      { name: "edit_order", description: "Can edit order" },
      { name: "edit_order_item", description: "Can edit order item" },
      { name: "edit_menu_item", description: "Can edit menu item" },
      { name: "edit_menu_category", description: "Can edit menu category" },
      { name: "delete_menu", description: "Can delete restaurant menu" },
      { name: "delete_order", description: "Can delete order" },
      { name: "delete_order_item", description: "Can delete order item" },
      { name: "delete_menu_item", description: "Can delete menu item" },
      { name: "delete_menu_category", description: "Can delete menu category" },
    ]);

    const permissionMap = {};
    permissions.forEach((p) => (permissionMap[p.name] = p.id));

    // Step 3: Create Users
    const users = await User.bulkCreate([
      {
        first_name: "Super",
        last_name: "Admin",
        email: "super@admin.com",
        password: "SuperAdmin123",
        phone_number: "+251919765445",
        role_id: roleMap["super_admin"],
        is_active: true,
        is_staff: true,
        is_superuser: true,
      },
      {
        first_name: "Admin",
        last_name: "Test",
        email: "admin@test.com",
        password: "Admin123",
        phone_number: "+251919765447",
        role_id: roleMap["admin"],
        is_active: true,
        is_staff: true,
        is_superuser: false,
      },
      {
        first_name: "Customer",
        last_name: "Test",
        email: "customer@test.com",
        password: "Customer123",
        phone_number: "+251919765447",
        role_id: roleMap["admin"],
        is_active: true,
        is_staff: false,
        is_superuser: false,
      },
    ]);

    const userMap = {};
    users.forEach((user) => (userMap[user.email] = user.id));

    await RolePermission.bulkCreate([
      {
        restaurant_id: restaurant.id,
        role_id: roleMap["super_admin"],
        permission_id: permissionMap["manage_users"],
        granted: true,
      },
      {
        restaurant_id: restaurant.id,
        role_id: roleMap["super_admin"],
        permission_id: permissionMap["manage_roles"],
        granted: true,
      },
      {
        restaurant_id: restaurant.id,
        role_id: roleMap["super_admin"],
        permission_id: permissionMap["manage_permissions"],
        granted: true,
      },
      {
        restaurant_id: restaurant.id,
        role_id: roleMap["admin"],
        permission_id: permissionMap["edit_menu"],
        granted: true,
      },
      {
        restaurant_id: restaurant.id,
        role_id: roleMap["customer"],
        permission_id: permissionMap["view_orders"],
        granted: true,
      },
    ]);

    console.log("✅ Seed data added successfully.");
  } catch (error) {
    console.error("❌ Error seeding data:", error);
  } finally {
    await sequelize.close();
  }
})();
