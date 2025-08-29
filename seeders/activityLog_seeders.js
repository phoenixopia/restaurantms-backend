"use strict";

const { ActivityLog, User } = require("../models/index");

module.exports = async () => {
  try {
    console.log("Seeding ActivityLogs...");

    const users = await User.findAll({ limit: 3 });

    if (users.length === 0) {
      console.log("⚠️ No users found. Skipping ActivityLog seeding.");
      return;
    }

    const logs = [
      {
        user_id: users[0].id,
        module: "Reservations",
        action: "Created a new reservation",
        details: { table: 5, time: "19:00" },
      },
      {
        user_id: users[1].id,
        module: "Customers",
        action: "Updated customer info",
        details: {
          field: "email",
          old: "old@example.com",
          new: "new@example.com",
        },
      },
      {
        user_id: users[2].id,
        module: "Menus",
        action: "Added a new menu item",
        details: { item: "Margherita Pizza", price: 12.5 },
      },
    ];

    for (const log of logs) {
      await ActivityLog.findOrCreate({
        where: {
          user_id: log.user_id,
          module: log.module,
          action: log.action,
        },
        defaults: log,
      });
    }

    console.log("✅ ActivityLogs seeded successfully");
  } catch (error) {
    console.error("❌ Failed seeding ActivityLogs:", error);
  }
};
