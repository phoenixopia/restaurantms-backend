const { Notification, User, Branch } = require("../models");
const { getIo } = require("../socket");
const { Op } = require("sequelize");
const throwError = require("./throwError");

const SendNotification = {
  // ========= Ticketing Notification =========
  async sendTicketingNotification(
    restaurant_id,
    title,
    message,
    created_by = null,
    branch_id = null
  ) {
    let where = {};

    if (branch_id) {
      where.branch_id = branch_id;
    } else if (restaurant_id) {
      where.restaurant_id = restaurant_id;
    } else {
      throwError("Invalid sender info", 400);
    }

    const users = await User.findAll({ where });
    const notifications = [];
    const io = getIo();

    for (const u of users) {
      const notification = await Notification.create({
        title,
        message,
        type: "TICKET",
        state: "info",
        data: null,
        created_by,
        target_user_id: u.id,
        restaurant_id: u.restaurant_id,
        branch_id: u.branch_id,
      });

      notifications.push(notification);
      io.to(`user_${u.id}`).emit("notification", notification);
    }

    return notifications;
  },

  // ========= Inventory Notification =========
  async sendInventoryNotification(
    branch_id,
    title,
    message,
    created_by = null
  ) {
    const branch = await Branch.findByPk(branch_id, {
      attributes: ["id", "restaurant_id"],
    });
    if (!branch) throwError("Branch not found", 404);

    const users = await User.findAll({
      where: {
        [Op.or]: [{ branch_id }, { restaurant_id: branch.restaurant_id }],
      },
    });
    const notifications = [];
    const io = getIo();

    for (const u of users) {
      const notification = await Notification.create({
        title,
        message,
        type: "INVENTORY",
        state: "info",
        data: null,
        created_by,
        target_user_id: u.id,
        restaurant_id: branch.restaurant_id,
        branch_id,
      });

      notifications.push(notification);
      io.to(`user_${u.id}`).emit("notification", notification);
    }

    return notifications;
  },
  // ========= Admin Notification =========
  async sendAdminNotification(title, message, created_by = null) {
    const users = await User.findAll({
      where: {
        restaurant_id: { [Op.is]: null },
        branch_id: { [Op.is]: null },
      },
    });

    const notifications = [];
    const io = getIo();

    for (const u of users) {
      const notification = await Notification.create({
        title,
        message,
        type: "ADMIN",
        state: "info",
        data: null,
        created_by,
        target_user_id: u.id,
        restaurant_id: null,
        branch_id: null,
      });

      notifications.push(notification);
      io.to(`user_${u.id}`).emit("notification", notification);
    }

    return notifications;
  },
};

module.exports = SendNotification;
