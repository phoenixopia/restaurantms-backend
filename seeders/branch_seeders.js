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

  for (const restaurant of restaurants) {
    const branchData = [
      {
        restaurant_id: restaurant.id,
        location_id: locations[0].id,
        name: "Bole Branch",
        status: "active",
        main_branch: true,
        opening_time: "02:00:00",
        closing_time: "04:00:00",
        created_at: now,
        updated_at: now,
      },
      {
        restaurant_id: restaurant.id,
        location_id: locations[1].id,
        name: "Megenagna Branch",
        status: "active",
        main_branch: false,
        opening_time: "02:00:00",
        closing_time: "03:00:00",
        created_at: now,
        updated_at: now,
      },
      {
        restaurant_id: restaurant.id,
        location_id: locations[2].id,
        name: "Kazanchis Branch",
        status: "active",
        main_branch: false,
        opening_time: "02:30:00",
        closing_time: "03:00:00",
        created_at: now,
        updated_at: now,
      },
    ];

    for (const branch of branchData) {
      await Branch.findOrCreate({
        where: {
          restaurant_id: branch.restaurant_id,
          name: branch.name,
        },
        defaults: {
          ...branch,
          id: uuidv4(), // generate new UUID if creating
        },
      });
    }
  }

  console.log(
    `✅ Branch seeding completed across ${restaurants.length} restaurants`
  );
};
