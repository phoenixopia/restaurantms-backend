"use strict";

const { Reservation, Restaurant, Branch, Table, Customer } = require("../models/index");

module.exports = async () => {
  try {
    console.log("Seeding Reservations...");

    const restaurant = await Restaurant.findOne();
    const branch = await Branch.findOne({ where: { restaurant_id: restaurant.id } });
    const table = await Table.findOne({ where: { branch_id: branch.id } });
    const customer = await Customer.findOne();

    if (!restaurant || !branch || !table || !customer) {
      console.warn("Missing restaurant/branch/table/customer. Skipping reservations seeder.");
      return;
    }

    const now = new Date();
    const reservationsData = [
      {
        restaurant_id: restaurant.id,
        branch_id: branch.id,
        customer_id: customer.id,
        table_id: table.id,
        start_time: new Date(now.getTime() + 1 * 60 * 60 * 1000), // 1h from now
        end_time: new Date(now.getTime() + 2 * 60 * 60 * 1000),   // 2h from now
        guest_count: 2,
        status: "confirmed",
      },
      {
        restaurant_id: restaurant.id,
        branch_id: branch.id,
        customer_id: customer.id,
        table_id: table.id,
        start_time: new Date(now.getTime() + 3 * 60 * 60 * 1000), // 3h from now
        end_time: new Date(now.getTime() + 4 * 60 * 60 * 1000),   // 4h from now
        guest_count: 4,
        status: "pending",
      },
    ];

    await Reservation.bulkCreate(reservationsData, { ignoreDuplicates: true });

    console.log("✅ Reservations seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding Reservations:", error);
  }
};
