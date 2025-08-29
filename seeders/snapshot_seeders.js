"use strict";

const { AnalyticsSnapshot, Restaurant } = require("../models");

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

    const snapshotDate = new Date(); // you can normalize to YYYY-MM-DD if you want daily uniqueness

    for (const restaurant of restaurants) {
      await AnalyticsSnapshot.findOrCreate({
        where: {
          restaurant_id: restaurant.id,
          snapshot_date: snapshotDate,
        },
        defaults: {
          total_orders: Math.floor(Math.random() * 100),
          total_sales: parseFloat((Math.random() * 1000).toFixed(2)),
          total_customers: Math.floor(Math.random() * 50),
          total_items_sold: Math.floor(Math.random() * 200),
          reservation_count: Math.floor(Math.random() * 30),
          avg_order_value: parseFloat((Math.random() * 100).toFixed(2)),
          payment_method_breakdown: {
            cash: Math.floor(Math.random() * 50),
            card: Math.floor(Math.random() * 50),
          },
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    }

    console.log("✅ AnalyticsSnapshots seeded successfully");
  } catch (error) {
    console.error("❌ Seeding AnalyticsSnapshots failed:", error);
    throw error;
  }
};
