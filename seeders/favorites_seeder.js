"use strict";

const { Favorite, Customer, Restaurant, Menu } = require("../models");
const { v4: uuidv4 } = require("uuid");

module.exports = async () => {
  const now = new Date();

  // Fetch some existing records to link favorites realistically
  const customers = await Customer.findAll({ limit: 2 });
  const restaurants = await Restaurant.findAll({ limit: 2 });
  const menus = await Menu.findAll({ limit: 2 });

  if (!customers.length || (!restaurants.length && !menus.length)) {
    console.warn("⚠️ Skipping Favorite seeder: Missing required data.");
    return;
  }

  await Favorite.bulkCreate([
    // --- Restaurant Favorites ---
    {
      customer_id: customers[0].id,
      targetId: restaurants[0]?.id,
      targetType: "restaurant",
      is_favorite: true,
      created_at: now,
      updated_at: now,
    },
    {
      customer_id: customers[1].id,
      targetId: restaurants[1]?.id,
      targetType: "restaurant",
      is_favorite: true,
      created_at: now,
      updated_at: now,
    },

    // --- Menu Favorites ---
    {
      customer_id: customers[0].id,
      targetId: menus[0]?.id,
      targetType: "menu",
      is_favorite: true,
      created_at: now,
      updated_at: now,
    },
    {
      customer_id: customers[1].id,
      targetId: menus[1]?.id,
      targetType: "menu",
      is_favorite: true,
      created_at: now,
      updated_at: now,
    },
  ]);

  console.log("✅ Favorites seeded successfully!");
};
