"use strict";

const {
  Reservation,
  Restaurant,
  Branch,
  Table,
  Customer,
} = require("../models");
const { v4: uuidv4 } = require("uuid");

module.exports = async () => {
  const restaurants = await Restaurant.findAll({ include: [Branch] });
  const customers = await Customer.findAll();

  for (const restaurant of restaurants) {
    for (const branch of restaurant.Branches) {
      const tables = await Table.findAll({
        where: { branch_id: branch.id, is_active: true },
      });

      if (tables.length === 0 || customers.length === 0) continue;

      const reservationCount = Math.floor(Math.random() * 10) + 5;

      for (let i = 0; i < reservationCount; i++) {
        const table = tables[Math.floor(Math.random() * tables.length)];
        const customer =
          customers[Math.floor(Math.random() * customers.length)];

        const startTime = new Date();
        startTime.setHours(Math.floor(Math.random() * 12) + 8);
        startTime.setMinutes(Math.floor((Math.random() / 2) * 60));
        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + 2);

        const [reservation, created] = await Reservation.findOrCreate({
          where: {
            restaurant_id: restaurant.id,
            branch_id: branch.id,
            table_id: table.id,
            customer_id: customer.id,
            start_time: startTime,
          },
          defaults: {
            id: uuidv4(),
            end_time: endTime,
            guest_count: Math.floor(Math.random() * table.capacity) + 1,
            status: ["pending", "confirmed", "cancelled"][
              Math.floor(Math.random() * 3)
            ],
            created_at: new Date(),
            updated_at: new Date(),
          },
        });

        if (created) {
          console.log(
            `✅ Reservation created for table ${table.id} at branch ${branch.name}`
          );
        } else {
          console.log(
            `ℹ️ Reservation already exists for table ${table.id} at branch ${branch.name}`
          );
        }
      }
    }
  }

  console.log(
    "🎉 Reservation seeding completed successfully for all branches."
  );
};
