"use strict";

const { Branch, Restaurant, Location } = require("../models");
const { v4: uuidv4 } = require("uuid");

module.exports = async () => {
  const now = new Date();

  const restaurant = await Restaurant.findOne(); // first restaurant
  const locations = await Location.findAll();

  await Branch.bulkCreate([
    {
      id: uuidv4(),
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
      id: uuidv4(),
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
      id: uuidv4(),
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
  ]);
};
