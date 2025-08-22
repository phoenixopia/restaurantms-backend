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
    // await sequelize.sync({ alter: true });
    // Drop tables in reverse dependency order
    // console.log("Dropping tables...");
    // await ActivityLog.drop();
    // await Reservation.drop();
    // await Table.drop();
    // await Snapshot.drop();
    // await Branch.drop();
    // await Restaurant.drop();
    // await Customer.drop();
    // await MenuItem.drop();
    // await MenuCategory.drop();
    // await Menu.drop();
    // await Catering.drop();
    // await Video.drop();
    // await User.drop();
    // await RolePermission.drop();
    // await Permission.drop();
    // await Role.drop();
    // await RoleTag.drop();
    // await Plan.drop();
    // await CategoryTag.drop();

    // console.log("✅ All tables dropped");

    // Recreate tables in dependency order
    console.log("Creating tables...");
    // await RoleTag.sync();
    // await Role.sync();
    await Permission.sync();
    await RolePermission.sync();
    await User.sync();
    await Plan.sync();
    await CategoryTag.sync();
    await Restaurant.sync();
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
    // await require("./users-seeder")();
    await require("./staff_seeders")();

    // 2. Plans & Categories/Tags
    await require("./seed_plan")();
    await require("./seed_category_tag")();

    // 3. Core Entities
    await require("./restaurants-seeder")();
    await require("./branches-seeder")();
    await require("./snapshots-seeder")();

    // 4. Reservations & Tables
    await require("./tables-seeder")();
    await require("./reservations-seeder")();

    // 5. Menus
    await require("./menus-seeder")();
    await require("./menu-categories-items-seeder")();

    // 6. Customers
    await require("./customers-seeder")();

    // 7. Media & Packages
    // await require("./image-gallery-seeder")();
    await require("./catering-seeder")();
    await require("./videos-seeder")();

    // snaphot analystics
    await require("./snapshot_seeders")();

    console.log("🎉 All seeders completed successfully");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await sequelize.close();
  }
})();
