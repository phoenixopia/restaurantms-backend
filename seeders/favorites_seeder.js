"use strict";

const { Favorite, Customer, Restaurant, MenuItem } = require("../models/index");
const { v4: uuidv4 } = require("uuid");

module.exports = async () => {
  await Favorite.sync({ force: true });
  const now = new Date();

  // Fetch some existing records to link favorites realistically
  // const customers = await Customer.findAll({ limit: 2 });
  const customers = await Customer.findOne({where:{ email: "customer1@gmail.com" }});
  const restaurants = await Restaurant.findAll({ limit: 2 });
  const menuItems = await MenuItem.findAll({ limit: 4 });

  if (!customers || (!restaurants.length && !menus.length)) {
    console.warn("⚠️ Skipping Favorite seeder: Missing required data.");
    return;
  }

  await Favorite.bulkCreate([
    // --- Restaurant Favorites ---
    {
      customer_id: customers.id,
      targetId: restaurants[0]?.id,
      targetType: "restaurant",
      is_favorite: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      customer_id: customers.id,
      targetId: restaurants[1]?.id,
      targetType: "restaurant",
      is_favorite: true,
      createdAt: now,
      updatedAt: now,
    },

    // --- Menu Favorites ---
    {
      customer_id: customers.id,
      targetId: menuItems[0]?.id,
      targetType: "item",
      is_favorite: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      customer_id: customers.id,
      targetId: menuItems[1]?.id,
      targetType: "item",
      is_favorite: true,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  console.log("✅ Favorites seeded successfully!");
};
