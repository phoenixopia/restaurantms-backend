"use strict";

const { v4: uuidv4 } = require("uuid");
const { Order, MenuItem, OrderItem } = require("../models");

module.exports = async () => {
  const now = new Date();
  console.log("🚀 Starting order items seeding...");

  try {
    // --- 1️⃣ Fetch existing orders and menu items
    const orders = await Order.findAll({ limit: 10 });
    const menuItems = await MenuItem.findAll({ limit: 20 });

    if (!orders.length) {
      throw new Error("❌ No orders found. Please seed orders first.");
    }
    if (!menuItems.length) {
      throw new Error("❌ No menu items found. Please seed menu items first.");
    }

    console.log(`✅ Found ${orders.length} orders and ${menuItems.length} menu items.`);

    // --- 2️⃣ Create order items
    const orderItems = [];

    for (const order of orders) {
      // Each order gets 1-4 random menu items
      const itemCount = Math.floor(Math.random() * 4) + 1;
      const selectedItems = [];

      for (let i = 0; i < itemCount; i++) {
        let randomMenuItem;
        let attempts = 0;
        
        // Ensure we don't add duplicate items to the same order
        do {
          randomMenuItem = menuItems[Math.floor(Math.random() * menuItems.length)];
          attempts++;
        } while (
          selectedItems.some(item => item.menu_item_id === randomMenuItem.id) && 
          attempts < 10
        );

        if (attempts < 10) {
          selectedItems.push(randomMenuItem);
          
          const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 quantity
          const unitPrice = parseFloat(randomMenuItem.price) || 10.99; // Use menu item price or default

          const orderItem = {
            id: uuidv4(),
            order_id: order.id,
            menu_item_id: randomMenuItem.id,
            quantity: quantity,
            unit_price: unitPrice,
            created_at: now,
            updated_at: now,
          };

          orderItems.push(orderItem);
        }
      }
    }

    // --- 3️⃣ Bulk create order items
    await OrderItem.bulkCreate(orderItems);
    console.log(`✅ Created ${orderItems.length} order items.`);

    // --- 4️⃣ Log some statistics
    const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = orderItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    
    console.log(`📊 Order Items Statistics:`);
    console.log(`   - Total items quantity: ${totalQuantity}`);
    console.log(`   - Total order value: $${totalValue.toFixed(2)}`);
    console.log(`   - Average items per order: ${(orderItems.length / orders.length).toFixed(1)}`);

    console.log("🎉 Order items seeded successfully!");
  } catch (err) {
    console.error("❌ Error seeding order items:", err);
    throw err;
  }
};