"use strict";

const { Order, Customer, User, Restaurant, Branch, Table, Location } = require("../models");
const { v4: uuidv4 } = require("uuid");

module.exports = async () => {
    await Order.sync({ force: true });
    const now = new Date();

    // Fetch some existing records
    const customers = await Customer.findOne({where:{ email: "customer1@gmail.com" }});
    const users = await User.findAll({ limit: 2 });
    const restaurants = await Restaurant.findAll({ limit: 2 });
    const branches = await Branch.findAll({ limit: 2 });
    const tables = await Table.findAll({ limit: 2 });
    const locations = await Location.findAll({ limit: 2 });
        
    if (!restaurants.length || !branches.length) {
        console.warn("⚠️ Skipping Order seeder: Missing required restaurant/branch data.");
        return;
    }

    await Order.bulkCreate([
        {
            restaurant_id: restaurants[0].id,
            branch_id: branches[0].id,
            customer_id: customers?.id || null,
            user_id: users[0]?.id || null,
            table_id: tables[0]?.id || null,
            delivery_location_id: locations[0]?.id || null,
            order_date: now,
            type: "dine-in",
            status: "Pending",
            total_amount: (Math.random() * 200 + 50).toFixed(2),
            payment_status: "Unpaid",
            is_seen_by_customer: false,
            createdAt: now,
            updatedAt: now,
        },
        {
            restaurant_id: restaurants[1].id,
            branch_id: branches[0].id,
            customer_id: customers?.id || null,
            user_id: users[1]?.id || null,
            table_id: tables[1]?.id || null,
            delivery_location_id: locations[0]?.id || null,
            order_date: now,
            type: "dine-in",
            status: "Served",
            total_amount: (Math.random() * 200 + 50).toFixed(2),
            payment_status: "Paid",
            is_seen_by_customer: false,
            createdAt: now,
            updatedAt: now,
        },
        {
            restaurant_id: restaurants[0].id,
            branch_id: branches[0].id,
            customer_id: customers?.id || null,
            user_id: users[2]?.id || null,
            table_id: tables[2]?.id || null,
            delivery_location_id: locations[0]?.id || null,
            order_date: now,
            type: "dine-in",
            status: "Served",
            total_amount: (Math.random() * 200 + 50).toFixed(2),
            payment_status: "Unpaid",
            is_seen_by_customer: false,
            createdAt: now,
            updatedAt: now,
        },
        {
            restaurant_id: restaurants[1].id,
            branch_id: branches[1].id,
            customer_id: customers?.id || null,
            user_id: users[0]?.id || null,
            table_id: tables[1]?.id || null,
            delivery_location_id: locations[1]?.id || null,
            order_date: now,
            type: "takeaway",
            status: "InProgress",
            total_amount: (Math.random() * 200 + 50).toFixed(2),
            payment_status: "Paid",
            is_seen_by_customer: true,
            createdAt: now,
            updatedAt: now,
        },
    ]);

    console.log("✅ Orders seeded successfully!");
};
