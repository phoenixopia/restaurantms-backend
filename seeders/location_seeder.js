"use strict";

const { Location } = require("../models");
const { v4: uuidv4 } = require("uuid");

module.exports = async () => {
  const now = new Date();

  const locations = [
    {
      address: "Bole Road, Addis Ababa",
      latitude: 8.9806 + (Math.random() * 0.01 - 0.005),
      longitude: 38.7578 + (Math.random() * 0.01 - 0.005),
    },
    {
      address: "Megenagna Square, Addis Ababa",
      latitude: 9.0227 + (Math.random() * 0.01 - 0.005),
      longitude: 38.7869 + (Math.random() * 0.01 - 0.005),
    },
    {
      address: "Kazanchis Business District, Addis Ababa",
      latitude: 9.0185 + (Math.random() * 0.01 - 0.005),
      longitude: 38.7571 + (Math.random() * 0.01 - 0.005),
    },
  ];

  for (const loc of locations) {
    await Location.findOrCreate({
      where: { address: loc.address },
      defaults: {
        id: uuidv4(),
        latitude: loc.latitude,
        longitude: loc.longitude,
        created_at: now,
        updated_at: now,
      },
    });
  }

  console.log("✅ Locations seeded successfully");
};
