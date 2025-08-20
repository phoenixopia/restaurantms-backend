// seeders/index.js
const { sequelize } = require("../models");

(async () => {
  try {
    await sequelize.sync({ force: true });
    console.log("🔁 Database synced");

    // Run seeders in proper order
    await require("./seed_roles")();
    await require("./seed_permission")();
    await require("./seed_role_permission")();
    await require("./seed_plan")();
    await require("./seed_category_tag")();
    await require("./seed_to_test")();

    console.log("🎉 All seeders completed successfully");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await sequelize.close();
  }
})();
