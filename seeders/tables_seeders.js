"use strict";

const { Table, Restaurant, Branch } = require("../models");
const { v4: uuidv4 } = require("uuid");

module.exports = async () => {
  const restaurants = await Restaurant.findAll({ include: [Branch] });

  for (const restaurant of restaurants) {
    for (const branch of restaurant.Branches) {
      // Decide how many tables per branch (e.g., 5 to 15)
      const tableCount = Math.floor(Math.random() * 11) + 5;

      for (let i = 1; i <= tableCount; i++) {
        const tableNumber = `T-${i}`;

        await Table.findOrCreate({
          where: { branch_id: branch.id, table_number },
          defaults: {
            id: uuidv4(),
            restaurant_id: restaurant.id,
            branch_id: branch.id,
            table_number: tableNumber,
            capacity: Math.floor(Math.random() * 6) + 2, // 2-7 seats
            is_active: Math.random() < 0.9,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
      }
    }
  }

  console.log("✅ Table seeding completed successfully for all branches.");
};
