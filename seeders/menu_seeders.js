"use strict";

const { Menu, Restaurant } = require("../models");
const { v4: uuidv4 } = require("uuid");

module.exports = async () => {
  const now = new Date();
  const restaurants = await Restaurant.findAll();

  for (const restaurant of restaurants) {
    const [menu, created] = await Menu.findOrCreate({
      where: { restaurant_id: restaurant.id },
      defaults: {
        id: uuidv4(),
        name: `${restaurant.restaurant_name} Main Menu`,
        description: `The main menu for ${restaurant.restaurant_name}`,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    });

    if (created) {
      console.log(`🍽️ Menu created for ${restaurant.restaurant_name}`);
    } else {
      console.log(`ℹ️ Menu already exists for ${restaurant.restaurant_name}`);
    }
  }

  console.log("✅ Menus seeded successfully for all restaurants");
};
