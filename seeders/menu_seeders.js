"use strict";

const { Menu, Restaurant } = require("../models");
const { v4: uuidv4 } = require("uuid");

module.exports = async () => {
  const now = new Date();
  const restaurants = await Restaurant.findAll();

  for (const restaurant of restaurants) {
    await Menu.create({
      id: uuidv4(),
      restaurant_id: restaurant.id,
      name: `${restaurant.restaurant_name} Main Menu`,
      description: `The main menu for ${restaurant.restaurant_name}`,
      is_active: true,
      createdAt: now,
      updatedAt: now,
    });

    console.log(`🍽️ Menu created for ${restaurant.restaurant_name}`);
  }

  console.log("✅ Menus seeded successfully for all restaurants");
};
