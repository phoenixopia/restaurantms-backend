"use strict";

const { Location } = require("../models");
const { v4: uuidv4 } = require("uuid");

module.exports = async () => {
  const now = new Date();

  await Location.bulkCreate([
    {
      id: uuidv4(),
      address: "Bole Road, Addis Ababa",
      latitude: 8.9806 + (Math.random() * 0.01 - 0.005),
      longitude: 38.7578 + (Math.random() * 0.01 - 0.005),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      address: "Megenagna Square, Addis Ababa",
      latitude: 9.0227 + (Math.random() * 0.01 - 0.005),
      longitude: 38.7869 + (Math.random() * 0.01 - 0.005),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      address: "Kazanchis Business District, Addis Ababa",
      latitude: 9.0185 + (Math.random() * 0.01 - 0.005),
      longitude: 38.7571 + (Math.random() * 0.01 - 0.005),
      createdAt: now,
      updatedAt: now,
    },
  ]);
};
