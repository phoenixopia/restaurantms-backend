const bcryptjs = require("bcryptjs");
const {
  sequelize,
  User,
  Role,
  Permission,
  RolePermission,
  Plan,
  Restaurant,
  RestaurantUser,
  Subscription,
  Menu, MenuCategory, MenuItem, Review, Table, Order,
  Branch,
  SupportTicket,
  SystemSetting,
  TwoFA,
  Location,
  ActivityLog,
} = require("../models/index");
const { hashPassword } = require("../utils/hash");
const image = "https://drive.google.com/uc?id=1pMGXklJAHoz9YkE1udmLOLCofJhh9SPW";


(async () => {
  try {
    // WARNING: This drops all tables
    await sequelize.sync({ force: true });

    // Create Plans
    const plans = await Plan.bulkCreate([
      {
        name: "Basic",
        max_locations: 1,
        max_staff: 5,
        max_users: 10,
        max_kds: 2,
        kds_enabled: false,
        price: 29.99,
        billing_cycle: "monthly",
      },
      {
        name: "Pro",
        max_locations: 5,
        max_staff: 20,
        max_users: 50,
        max_kds: 5,
        kds_enabled: true,
        price: 99.99,
        billing_cycle: "monthly",
      },
    ]);
    const planMap = {};
    plans.forEach(plan => planMap[plan.name] = plan.id);

    
    // Create Subscription
    const subscription = await Subscription.create({
      plan_id: planMap["Basic"],
      start_date: new Date(),
      end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      billing_provider: "cash",
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
    ]);

    const roleMap = {};
    roles.forEach(role => roleMap[role.name] = role.id);

    // Step 2: Create Permissions (optional)
    const permissions = await Permission.bulkCreate([
      { name: "manage_users", description: "Can manage users", },
      { name: "manage_roles", description: "Can manage roles", },
      { name: "manage_permissions", description: "Can manage permissions", },
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
    permissions.forEach(p => permissionMap[p.name] = p.id);

    
    // Create Users
    const users = await User.bulkCreate([
      {
        first_name: "Super",
        last_name: "Admin",
        email: "super@admin.com",
        password: await hashPassword("SuperAdmin123"),
        // password: "SuperAdmin123",
        phone_number: "+251919765445",
        role_id: roleMap["super_admin"] ,
        isConfirmed: true,
        is_active: true,
        is_staff: true,
        is_superuser: true,
      },
      {
        first_name: "Admin",
        last_name: "Test",
        email: "admin@test.com",
        password: await hashPassword("Admin123"),
        phone_number: "+251919765447",
        role_id: roleMap["admin"],
        isConfirmed: true,
        is_active: true,
        is_staff: true,
        is_superuser: false,
      },
      {
        first_name: "Customer",
        last_name: "Test",
        email: "customer@test.com",
        password: await hashPassword("Customer123"),
        phone_number: "+251919765447",
        role_id: roleMap["admin"],
        isConfirmed: true,
        is_active: true,
        is_staff: false,
        is_superuser: false,
      },
    ],);
    const userMap = {};
    users.forEach(user => userMap[user.email] = user.id);


    // Assign Roles to Users
    // await UserRole.bulkCreate([
    //   { user_id: userMap["admin@gmail.com"], role_id: roleMap["super_admin"] },
    //   { user_id: userMap["user@gmail.com"], role_id: roleMap["customer"] },
    //   { user_id: userMap["test@gmail.com"], role_id: roleMap["customer"] },
    // ]);

    // Assign Permissions to Roles
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


    // Assign user to rrestaurant
    await RestaurantUser.bulkCreate([
      {
        user_id: userMap["super@admin.com"],
        restaurant_id: restaurant.id,
      },
      {
        user_id: userMap["admin@test.com"],
        restaurant_id: restaurant.id,
      },
      {
        user_id: userMap["customer@test.com"],
        restaurant_id: restaurant.id,
      },
    ]);

    // Menu
    const menus = await Menu.bulkCreate([
      {
        restaurant_id: restaurant.id,
        name: "Test Menu",
        description: "test TEST",
        is_active: true
      },
    ]);
    const menuMap = {};
    menus.forEach(menu => menuMap[menu.name] = menu.id);


    // Menu category
    const menuCategory = await MenuCategory.bulkCreate([
      {
        restaurant_id: restaurant.id,
        menu_id: menuMap['Test Menu'],
        name: "Test Category",
        description: "test TEST",
        is_active: true,
      },
      {
        restaurant_id: restaurant.id,
        menu_id: menuMap['Test Menu'],
        name: "Test Two Category",
        description: "test two",
        is_active: true,
      },
    ]);
    const menuCategoryMap = {};
    menuCategory.forEach(menuCat => menuCategoryMap[menuCat.name] = menuCat.id);


    // menu item
    const menuItems = await MenuItem.bulkCreate([
      {
        restaurant_id: restaurant.id,
        menu_id: menuMap["Test Menu"],
        menu_category_id: menuCategoryMap['Test Category'],
        name: 'Shekla Tibs',
        description: 'test',
        unit_price: 200,
        image_url: image
      },
    ]);
    const menuItemMap = {};
    menuItems.forEach(menuItem => menuItemMap[menuItem.name] = menuItem.id);


    // Review
    await Review.create(
      {
        customer_id: userMap["super@admin.com"], 
        menu_item_id: menuItemMap["Shekla Tibs"],
        detail: 'This is test review',
        rate: '4'
      },
    );

    // location
    const location = await Location.create({
      restaurant_id: restaurant.id,
        latitude: 37.7749,
        longitude: -122.4194,
        timestamp: new Date("2024-06-23T10:00:00Z"),
        accuracy: 10.0,
        altitude: 50.0,
        heading: 180.0,
        speed: 20.0
    })

    // table 
    const table = await Table.create({
      location_id: location.id,
      table_number: "A1",
      capacity: 4,
    })
    
    // orders
    const orders = await Order.bulkCreate([
      {
        restaurant_id: restaurant.id,
        user_id: userMap["admin@test.com"],
        table_id: table.id,
        date: new Date("2025-06-04"),
        type: "dine-in",
        total_amount: 200,
        payment_status: "paid",
      },
      {
        restaurant_id: restaurant.id,
        user_id: userMap["admin@test.com"],
        // table_id: table.id,
        date: new Date("2025-06-23"),
        type: "takeaway",
        total_amount: 100,
        payment_status: "un_paid",
      },
      {
        restaurant_id: restaurant.id,
        user_id: userMap["admin@test.com"],
        table_id: table.id,
        date: new Date("2025-06-24"),
        type: "dine-in",
        total_amount: 100,
        payment_status: "un_paid",
      },
    ]);
    const orderMap = {};
    orders.forEach(order => orderMap[order.type] = order.id);

    // // activity log
    // await ActivityLog.create({
    //   user_id: req.user.id,
    //   action: "update_user",
    //   entity_type: "User",
    //   entity_id: updatedUser.id, // <-- this is the entity_id
    //   metadata: {
    //     changed_fields: ['email', 'role_id']
    //   },
    //   ip_address: req.ip,
    //   user_agent: req.headers['user-agent']
    // });
    


    console.log("✅ Seed data added successfully.");
  } catch (error) {
    console.error("❌ Error seeding data:", error);
  } finally {
    await sequelize.close();
  }
})();
