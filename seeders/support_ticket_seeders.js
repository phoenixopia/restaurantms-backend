"use strict";

const { v4: uuidv4 } = require("uuid");
const { SupportTicket, User, Branch } = require("../models");

module.exports = async () => {
  const users = await User.findAll({
    include: [{ model: Branch, attributes: ["id", "restaurant_id"] }],
  });

  if (!users.length) {
    console.log("⚠️ No users found. Skipping support tickets seeding.");
    return;
  }

  const priorities = ["low", "medium", "high"];
  const now = new Date();

  for (const user of users) {
    let restaurantId = null;
    let branchId = null;

    if (user.restaurant_id) {
      // Restaurant admin → restaurant only
      restaurantId = user.restaurant_id;
    } else if (user.branch_id && user.Branch) {
      // Staff → branch + restaurant from branch
      branchId = user.branch_id;
      restaurantId = user.Branch.restaurant_id;
    } else {
      continue;
    }

    for (let i = 1; i <= 2; i++) {
      const title = `Issue ${i} by ${user.username || "user"}`;
      const [ticket] = await SupportTicket.findOrCreate({
        where: {
          user_id: user.id,
          title,
        },
        defaults: {
          id: uuidv4(),
          restaurant_id: restaurantId,
          branch_id: branchId,
          user_id: user.id,
          description: `This is a seeded description for issue ${i} created by ${
            user.username || "user"
          }.`,
          status: "open",
          priority: priorities[(i - 1) % priorities.length],
          created_at: now,
          updated_at: now,
        },
      });
    }
  }

  console.log(
    "✅ Support tickets seeded successfully (restaurant admins → restaurant only, staff → branch + restaurant)"
  );
};
