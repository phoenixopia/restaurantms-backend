"use strict";

const { sequelize, Review, Customer, Restaurant, Order } = require("../models");
const { v4: uuidv4 } = require("uuid");

module.exports = async () => {
  console.log("Seeding reviews...");

  // Ensure the table is clean
  await Review.sync({ force: true });

  const now = new Date();

  // --- Fetch existing related data ---
  const customer = await Customer.findOne({ where: { email: "customer1@gmail.com" } });
  const restaurant = await Restaurant.findOne();
  const orders = await Order.findAll({ limit: 3 });

  if (!customer || !restaurant || !orders.length) {
    console.warn("⚠️ Skipping Review seeder: Missing required data (customer, restaurant, or orders).");
    return;
  }

  // --- Generate a few sample reviews ---
  const reviews = [
    {
      id: uuidv4(),
      restaurant_id: restaurant.id,
      customer_id: customer.id,
      order_id: orders[0].id,
      comment: "The food was amazing! Quick service and delicious taste.",
      rating: 5,
      createdAt: now,
      updatedAt: now,
    },
    // {
    //   id: uuidv4(),
    //   restaurant_id: restaurant.id,
    //   customer_id: customer.id,
    //   order_id: orders[1].id,
    //   comment: "Pretty good overall, though the delivery was a bit late.",
    //   rating: 4,
    //   createdAt: now,
    //   updatedAt: now,
    // },
    // {
    //   id: uuidv4(),
    //   restaurant_id: restaurant.id,
    //   customer_id: customer.id,
    //   order_id: orders[1].id,
    //   comment: "Not satisfied this time. The meal arrived cold.",
    //   rating: 2,
    //   createdAt: now,
    //   updatedAt: now,
    // },
  ];

  await Review.bulkCreate(reviews);

  console.log("✅ Reviews seeded successfully!");
};
