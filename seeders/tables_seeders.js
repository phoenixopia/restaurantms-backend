"use strict";

const { Table, Restaurant, Branch } = require("../models/index");

module.exports = async () => {
  try {
    console.log("Seeding Tables...");

    // Get restaurant & branch (assuming you have at least one seeded already)
    const restaurant = await Restaurant.findOne();
    const branch = await Branch.findOne({ where: { restaurant_id: restaurant.id } });

    if (!restaurant || !branch) {
      console.warn("⚠️ No restaurant/branch found. Skipping tables seeder.");
      return;
    }

    const tablesData = [
      {
        restaurant_id: restaurant.id,
        branch_id: branch.id,
        table_number: "T1",
        capacity: 2,
      },
      {
        restaurant_id: restaurant.id,
        branch_id: branch.id,
        table_number: "T2",
        capacity: 4,
      },
      {
        restaurant_id: restaurant.id,
        branch_id: branch.id,
        table_number: "T3",
        capacity: 6,
      },
    ];

    await Table.bulkCreate(tablesData, { ignoreDuplicates: true });

    console.log("✅ Tables seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding Tables:", error);
  }
};
