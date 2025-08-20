"use strict";

const { sequelize } = require("../models");

(async () => {
  try {
    await sequelize.sync({ force: true });
    console.log("🔁 Database synced");
    await require("./seed_roles_permissions")();
    console.log("🎉 All seeders completed successfully");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
})();
