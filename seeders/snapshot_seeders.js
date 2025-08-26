"use strict";

const { sequelize, AnalyticsSnapshot, Restaurant } = require("../models");

module.exports = async () => {
  try {
    console.log("📊 Seeding AnalyticsSnapshots...");

    const restaurants = await Restaurant.findAll();

    if (!restaurants.length) {
      console.log(
        "⚠️ No restaurants found. Skipping AnalyticsSnapshots seeding."
      );
      return;
    }

    for (const restaurant of restaurants) {
      await AnalyticsSnapshot.create({
        restaurant_id: restaurant.id,
        snapshot_date: new Date(),
        total_orders: Math.floor(Math.random() * 100),
        total_sales: (Math.random() * 1000).toFixed(2),
        total_customers: Math.floor(Math.random() * 50),
        total_items_sold: Math.floor(Math.random() * 200),
        reservation_count: Math.floor(Math.random() * 30),
        avg_order_value: (Math.random() * 100).toFixed(2),
        payment_method_breakdown: {
          cash: Math.floor(Math.random() * 50),
          card: Math.floor(Math.random() * 50),
        },
      });
    }

    console.log("✅ AnalyticsSnapshots seeded successfully");
  } catch (error) {
    console.error("❌ Seeding AnalyticsSnapshots failed:", error);
    throw error;
  }
};
