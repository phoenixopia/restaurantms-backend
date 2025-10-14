"use strict";

const { Branch, Restaurant, Location } = require("../models");
const { v4: uuidv4 } = require("uuid");

module.exports = async () => {
  const now = new Date();

  const restaurants = await Restaurant.findAll();
  const locations = await Location.findAll();

  if (restaurants.length === 0 || locations.length < 3) {
    console.log(
      "⚠️ Not enough restaurants or locations found. Skipping branch seeding."
    );
    return;
  }

  let branches = [];

  restaurants.forEach((restaurant) => {
    branches.push(
      {
        id: uuidv4(),
        restaurant_id: restaurant.id,
        location_id: locations[0].id,
        name: "Bole Branch",
        status: "active",
        main_branch: true,
        opening_time: "02:00:00",
        closing_time: "04:00:00",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        restaurant_id: restaurant.id,
        location_id: locations[1].id,
        name: "Megenagna Branch",
        status: "active",
        main_branch: false,
        opening_time: "02:00:00",
        closing_time: "03:00:00",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        restaurant_id: restaurant.id,
        location_id: locations[2].id,
        name: "Kazanchis Branch",
        status: "active",
        main_branch: false,
        opening_time: "02:30:00",
        closing_time: "03:00:00",
        createdAt: now,
        updatedAt: now,
      }
    );
  });

  await Branch.bulkCreate(branches);

  console.log(
    `✅ Seeded ${branches.length} branches across ${restaurants.length} restaurants`
  );
};
