const { Notification, User, Customer } = require("../../models");
const { sendNotificationEmail } = require("../../utils/sendEmail");
const {
  sendSMSNotification,
  sendInAppNotification,
} = require("../../utils/send_notification");
const Info = require("../../utils/info");
const throwError = require("../../utils/throwError");

const MAX_RETRIES = 3;

const NotificationService = {
  async createAndSendNotification({
    user_id,
    customer_id,
    channel,
    title,
    body,
    io,
  }) {
    if (!user_id && !customer_id) {
      throwError("Notification must target a user or customer", 400);
    }
    const notification = await Notification.create({
      user_id,
      customer_id,
      channel,
      title,
      body,
      status: "Pending",
      retry_count: 0,
    });
    try {
      const recipient = user_id
        ? await User.findByPk(user_id)
        : await Customer.findByPk(customer_id);

      if (!recipient) throwError("User not found", 404);

      switch (channel) {
        case "Email":
          await sendNotificationEmail(
            recipient.email,
            recipient.first_name,
            recipient.last_name,
            title,
            body
          );
          break;
        case "SMS":
          await sendSMSNotification(recipient.phone_number, body);
          break;
        case "In-App":
          sendInAppNotification(io, recipient.id, title, body);
          break;
        default:
          throwError("Invalid notification channel", 400);
      }
      notification.status = "Sent";
      notification.sent_at = new Date();
      await notification.save();
      return notification;
    } catch (err) {
      notification.retry_count += 1;

      if (notification.retry_count >= MAX_RETRIES) {
        notification.status = "Failed";
        notification.failed_at = new Date();
      }

      await notification.save();
      throwError("Failed to send notification: " + err.message);
    }
  },

  async getAllNotifications({ page = 1, limit = 10, requester }) {
    const offset = (page - 1) * limit;

    const where = requester.user_id
      ? { user_id: requester.user_id, status: "Sent" }
      : { customer_id: requester.customer_id, status: "Sent" };

    return Notification.findAndCountAll({
      where,
      offset,
      limit,
      order: [["created_at", "DESC"]],
    });
  },

  async getNotificationById(id, requester) {
    const where = requester.user_id
      ? { id, user_id: requester.user_id, status: "Sent" }
      : { id, customer_id: requester.customer_id, status: "Sent" };

    const notification = await Notification.findOne({ where });
    if (!notification) throwError("Notification not found", 404);

    return notification;
  },

  async retryNotification(id, io) {
    const notification = await Notification.findByPk(id);
    if (!notification) throwError("Notification not found", 404);
    if (notification.status === "Sent") throwError("Notification already sent");

    if (notification.retry_count >= MAX_RETRIES) {
      throwError("Max retries reached. Notification failed");
    }

    return await this.createAndSendNotification({
      user_id: notification.user_id,
      customer_id: notification.customer_id,
      channel: notification.channel,
      title: notification.title,
      body: notification.body,
      io,
    });
  },

  async handleOrderPlacedNotification({ order, customer, io }) {
    const branchTitle = "New Order Received";
    const branchBody =
      "You have received a new order. Login to your dashboard to view the order.";

    const customerTitle = "Order Placed Successfully";
    const customerBody =
      "Thank you for your order! Your order is being processed.";

    const branchUsers = await Info.getBranchUsers(order.branch_id);
    const restaurantAdmin = await Info.getRestaurantAdmin(order.restaurant_id);

    const notifications = [];

    notifications.push(
      NotificationService.createAndSendNotification({
        user_id: null,
        customer_id: customer.id,
        channel: "Email",
        title: customerTitle,
        body: customerBody,
        io,
      }),
      NotificationService.createAndSendNotification({
        user_id: null,
        customer_id: customer.id,
        channel: "In-App",
        title: customerTitle,
        body: customerBody,
        io,
      })
    );

    for (const user of branchUsers) {
      notifications.push(
        NotificationService.createAndSendNotification({
          user_id: user.id,
          customer_id: null,
          channel: "In-App",
          title: branchTitle,
          body: branchBody,
          io,
        })
      );
    }

    if (restaurantAdmin) {
      notifications.push(
        NotificationService.createAndSendNotification({
          user_id: restaurantAdmin.id,
          customer_id: null,
          channel: "In-App",
          title: branchTitle,
          body: branchBody,
          io,
        }),
        NotificationService.createAndSendNotification({
          user_id: restaurantAdmin.id,
          customer_id: null,
          channel: "Email",
          title: branchTitle,
          body: branchBody,
          io,
        })
      );
    }

    await Promise.all(notifications);
  },
};

module.exports = NotificationService;
