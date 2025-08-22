"use strict";

const { Video, VideoInteraction, Branch, Customer } = require("../models");
const { v4: uuidv4 } = require("uuid");

module.exports = async () => {
  const now = new Date();

  const branches = await Branch.findAll();
  const customers = await Customer.findAll();

  for (const branch of branches) {
    const video = await Video.create({
      id: uuidv4(),
      branch_id: branch.id,
      url: "https://www.w3schools.com/html/mov_bbb.mp4",
      title: `${branch.name} Promo`,
      created_at: now,
      updated_at: now,
    });

    // Add interactions from customers
    for (const customer of customers) {
      await VideoInteraction.create({
        id: uuidv4(),
        video_id: video.id,
        customer_id: customer.id,
        type: "view", // can also add "like", "favorite", "comment"
        created_at: now,
        updated_at: now,
      });
    }
  }
};
