// seeders/snapshot_seeders.js
const { v4: uuidv4 } = require("uuid");
const { AnalyticsSnapshot, Restaurant } = require("../models");

module.exports = async () => {
  try {
    console.log("📊 Seeding AnalyticsSnapshots...");

    const restaurants = await Restaurant.findAll({
      include: [
        { model: sequelize.models.MenuItem },
      ],
    });

    const now = new Date();

    for (const restaurant of restaurants) {
      // Generate snapshot for the last 7 days
      for (let i = 0; i < 7; i++) {
        const snapshotDate = new Date();
        snapshotDate.setDate(snapshotDate.getDate() - i);

        // Random top item from restaurant menu
        let topItemId = null;
        if (restaurant.MenuItems && restaurant.MenuItems.length > 0) {
          const randomIndex = Math.floor(Math.random() * restaurant.MenuItems.length);
          topItemId = restaurant.MenuItems[randomIndex].id;
        }

        await AnalyticsSnapshot.create({
          id: uuidv4(),
          restaurant_id: restaurant.id,
          snapshot_date: snapshotDate.toISOString().split("T")[0], // YYYY-MM-DD
          total_orders: Math.floor(Math.random() * 50) + 10,
          total_sales: (Math.random() * 500 + 50).toFixed(2),
          total_customers: Math.floor(Math.random() * 40) + 5,
          total_items_sold: Math.floor(Math.random() * 100) + 10,
          reservation_count: Math.floor(Math.random() * 20),
          avg_order_value: (Math.random() * 50 + 10).toFixed(2),
          top_item_id: topItemId,
          payment_method_breakdown: {
            cash: Math.floor(Math.random() * 50),
            card: Math.floor(Math.random() * 50),
            online: Math.floor(Math.random() * 50),
          },
          created_at: now,
          updated_at: now,
        });
      }
    }

    console.log("✅ AnalyticsSnapshots seeded successfully");
  } catch (error) {
    console.error("❌ Seeding AnalyticsSnapshots failed:", error);
    throw error;
  }
};
