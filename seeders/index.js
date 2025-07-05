const { sequelize } = require("../models");

(async () => {
  try {
    await sequelize.sync({ force: true });
    console.log("🔁 DB synced");

    await require("./seed_roles")();
    await require("./seed_permission")();
    await require("./seed_role_permission")();
    await require("./seed_plan")();
    await require("./seed_category_tag")();

    console.log("🎉 All data seeded successfully");
  } catch (error) {
    console.error("❌ Seeder failed:", error);
  } finally {
    await sequelize.close();
  }
})();
