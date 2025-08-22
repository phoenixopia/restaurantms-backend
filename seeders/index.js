// seeders/index.js
// const { sequelize } = require("../models/index");
const {
  sequelize,
  RoleTag,
  Role,
  Permission,
  RolePermission,
  User,
  Plan,
  CategoryTag,
  Restaurant,
  SystemSetting,
  Branch,
  AnalyticsSnapshot,
  Table,
  Reservation,
  Menu,
  MenuCategory,
  MenuItem,
  Customer,
  ActivityLog,
  Catering,
  Video,
} = require("../models/index");

(async () => {
  try {
    console.log("Starting database seeding...");
    // await sequelize.sync({ force: true });
    // await sequelize.sync({ alter: true });
    

    // Recreate tables in dependency order
    console.log("Creating tables...");
    // await RoleTag.sync();
    // await Role.sync();
    // await Permission.sync();
    // await RolePermission.sync();
    // await User.sync();
    // await Plan.sync();
    // await CategoryTag.sync();
    await Restaurant.sync();
    await SystemSetting.sync();
    await Branch.sync();
    await AnalyticsSnapshot.sync();
    await Table.sync();
    await Reservation.sync();
    await Menu.sync();
    await MenuCategory.sync();
    await MenuItem.sync();
    await Customer.sync();
    await ActivityLog.sync();
    await Catering.sync();
    await Video.sync();

    console.log("✅ All tables created");

    console.log("🔁 Database synced");


    // 1. Auth & Access Control
    await require("./seed_role_tags")();
    await require("./seed_roles")();
    await require("./seed_permission")();
    await require("./seed_role_permission")();

    // user seeders
    await require("./seed_super_admin")();
    await require("./staff_seeders")();

    // 2. Plans & Categories/Tags
    await require("./seed_plan")();
    await require("./seed_category_tag")();

    // 3. Core Entities
    await require("./seed_restaurant")();
    await require("./branch_seeders")();
    await require("./snapshot_seeders")();

    // 4. Reservations & Tables
    await require("./tables_seeders")();
    await require("./reservation_seeders")();

    // 5. Menus
    await require("./menu_seeders")();
    await require("./menu_category_items_seeders")();

    // 6. Customers
    await require("./customers_seeders")();

    // 7. Media & Packages
    // await require("./image-gallery-seeder")();
    await require("./catering_seeder")();
    await require("./video_seeders")();

    // snaphot analystics
    // await require("./snapshot_seeders")();

    console.log("🎉 All seeders completed successfully");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await sequelize.close();
  }
})();
