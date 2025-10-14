"use strict";

const { v4: uuidv4 } = require("uuid");
const { Notification, User, Branch, Sequelize } = require("../models");
const { Op } = Sequelize; // ✅ Import operators

module.exports = async () => {
  try {
    console.log("🌱 Starting notifications seeding...");

    // pick one admin user (restaurant_id not null)
    const adminUser = await User.findOne({
      where: { restaurant_id: { [Op.ne]: null } }, // ✅ fix here
    });

    // pick one staff user (branch_id not null)
    const staffUser = await User.findOne({
      where: { branch_id: { [Op.ne]: null } }, // ✅ fix here
    });

    if (!adminUser && !staffUser) {
      console.warn(
        "⚠️ No admin or staff user found. Skipping notifications seeding."
      );
      return;
    }

    const now = new Date();
    const notifications = [];

    if (adminUser) {
      notifications.push({
        id: uuidv4(),
        target_user_id: adminUser.id,
        type: "ORDER",
        title: "New Online Order",
        message: "You have received a new order from the customer app.",
        state: "info",
        restaurant_id: adminUser.restaurant_id,
        created_by: adminUser.id,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (staffUser) {
      const branch = await Branch.findByPk(staffUser.branch_id);

      notifications.push(
        {
          id: uuidv4(),
          target_user_id: staffUser.id,
          type: "TICKET",
          title: "Support Ticket Assigned",
          message: "A support ticket has been assigned to your branch.",
          state: "warning",
          branch_id: branch ? branch.id : null,
          restaurant_id: branch ? branch.restaurant_id : null,
          created_by: staffUser.id,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: uuidv4(),
          target_user_id: staffUser.id,
          type: "INVENTORY",
          title: "Low Stock Alert",
          message: "Stock for 'Tomato Sauce' is running low at your branch.",
          state: "error",
          branch_id: branch ? branch.id : null,
          restaurant_id: branch ? branch.restaurant_id : null,
          created_by: staffUser.id,
          createdAt: now,
          updatedAt: now,
        }
      );
    }

    if (notifications.length) {
      await Notification.bulkCreate(notifications);
      console.log(
        `✅ Seeded ${notifications.length} notifications successfully`
      );
    } else {
      console.log("⚠️ No notifications created (no users found)");
    }
  } catch (error) {
    console.error("❌ Failed to seed notifications:", error);
  }
};
