"use strict";

const { KdsOrder, Order, Restaurant, Branch } = require("../models");
const { v4: uuidv4 } = require("uuid");

module.exports = async () => {
  await KdsOrder.sync({ force: true });
  const now = new Date();

  // Fetch existing orders, restaurants, and branches
  const orders = await Order.findAll({ limit: 3 });
  const restaurants = await Restaurant.findAll({ limit: 2 });
  const branches = await Branch.findAll({ limit: 2 });

  if (!orders.length || !restaurants.length || !branches.length) {
    console.warn("⚠️ Skipping KdsOrder seeder: Missing required data.");
    return;
  }

  await KdsOrder.bulkCreate(
    orders.map((order, index) => ({
      restaurant_id: order.restaurant_id,
      branch_id: order.branch_id,
      order_id: order.id,
      status: ["Pending", "InProgress", "Preparing", "Ready", "Served", "Cancelled"][
        Math.floor(Math.random() * 6)
      ],
      createdAt: now,
      updatedAt: now,
    }))
  );

  console.log(`✅ KdsOrders seeded successfully!`);
};
