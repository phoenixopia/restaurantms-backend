// seeders/index.js
// seeders/index.js
const { sequelize } = require("../models/index");

(async () => {
  try {
    console.log("Starting database seeding...");
    await sequelize.sync({ force: true });
    console.log("🔁 Database synced");


    // 1. Auth & Access Control
    await require("./roles-seeder")();
    await require("./seed_permission")();
    await require("./seed_role_permission")();

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
