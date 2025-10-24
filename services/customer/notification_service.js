"use strict";

const { Notification, User, sequelize } = require("../../models");
const { Op, where } = require("sequelize");
const { getIo } = require("../../socket");
const throwError = require("../../utils/throwError");

const NotificationService = {
    // list all notification of customer
    async listAllNotificationsForCustomer(query, customerId) {

        const where = {
            target_customer_id: customerId,

        };

        const { count, rows } = await Notification.findAndCountAll({
            where,
            order: [["createdAt", "DESC"]],
        });

        return { rows, count };
    },

    //get all unread customer notification
    async listUnreadNotificationsForCustomer(query, customerId) {

        const where = {
            target_customer_id: customerId,
            is_read: false,
        };

        const { count, rows } = await Notification.findAndCountAll({
            where,
            order: [["createdAt", "DESC"]],
        });

        return { rows, count };
    },


    async getNotificationById(notificationId) {

        const notification = await Notification.findByPk(notificationId);

        if (!notification) throwError("Notification not found", 404);

        return notification;
    },

  
    async MakeSeenNotofication(notificationId) {
        const notification = await Notification.findByPk(notificationId);
        if (!notification) throwError("Notification not found", 404);

        notification.is_read = true;
        notification.read_at = new Date();
        await notification.save();

        return notification;
    },

    async markAsRead(customerId) {

        // Update all notifications
        const [updatedCount] = await Notification.update(
            { is_read: true, read_at: new Date() },
            { where: { target_customer_id: customerId, is_read: false }, }
        );

        return updatedCount;
    },

    async unreadCount(customerId) {
        const where = {
            is_read: false,
            target_customer_id: customerId 
        };

        const count = await Notification.count({ where });
        return count;
    },
};

module.exports = NotificationService;
