"use strict";

const { SupportTicket, User, Branch, sequelize } = require("../../models");
const { Op } = require("sequelize");
const throwError = require("../../utils/throwError");
const SendNotification = require("../../utils/send_notification");
const logActivity = require("../../utils/logActivity");

const TicketService = {
  // ------------------ Create Ticket ------------------
  async createTicket(data, user) {
    const t = await sequelize.transaction();
    try {
      const { title, description, priority, branch_id = null } = data;

      if (!title) throwError("Title is required", 400);
      if (!description) throwError("Description is required", 400);

      let restaurantId = null;
      if (user.restaurant_id) {
        restaurantId = user.restaurant_id;
      } else if (user.branch_id) {
        const branch = await Branch.findByPk(user.branch_id, {
          transaction: t,
        });
        if (!branch) throwError("Branch not found", 404);
        restaurantId = branch.restaurant_id;
      } else {
        throwError("User is not associated with any restaurant or branch", 400);
      }

      const ticket = await SupportTicket.create(
        {
          user_id: user.id,
          restaurant_id: restaurantId,
          branch_id: user.branch_id || null,
          title,
          description,
          priority,
        },
        { transaction: t }
      );

      // Send notifications
      const titleNotif = `New Ticket Sent`;
      const messageNotif = `You have sent ticket successfully.`;
      await SendNotification.sendTicketingNotification(
        restaurantId,
        titleNotif,
        messageNotif,
        user.id,
        user.branch_id
      );

      const titleAdmin = `New Ticket Received`;
      const messageAdmin = `"${restaurantId} sent a new ticket"`;
      await SendNotification.sendAdminNotification(titleAdmin, messageAdmin);

      // Log activity
      await logActivity({
        user_id: user.id,
        module: "SupportTicket",
        action: "Create",
        details: ticket.toJSON(),
        transaction: t,
      });

      await t.commit();
      return ticket;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  // ------------------ Get All Tickets ------------------
  async getAllTickets(query, user) {
    let {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      order = "DESC",
      status,
      priority,
    } = query;

    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const where = {};
    if (user.restaurant_id) where.restaurant_id = user.restaurant_id;
    else if (user.branch_id) where.branch_id = user.branch_id;

    if (search) where.title = { [Op.iLike]: `%${search}%` };
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const { count, rows } = await SupportTicket.findAndCountAll({
      where,
      order: [[sortBy, order.toUpperCase()]],
      limit,
      offset,
      include: [
        {
          model: User,
          attributes: [
            "id",
            "first_name",
            "last_name",
            "email",
            "phone_number",
          ],
        },
      ],
    });

    return {
      total: count,
      tickets: rows,
      page,
      totalPages: Math.ceil(count / limit),
    };
  },

  // ------------------ Get Ticket By ID ------------------
  async getTicketById(id) {
    const ticket = await SupportTicket.findByPk(id);
    if (!ticket) throwError("Ticket not found", 404);
    return ticket;
  },

  // ------------------ Update Ticket ------------------
  async updateTicket(id, data, user) {
    const t = await sequelize.transaction();
    try {
      const ticket = await SupportTicket.findByPk(id, { transaction: t });
      if (!ticket) throwError("Ticket not found", 404);

      if (ticket.status !== "open")
        throwError("Only tickets with status 'open' can be updated", 400);

      const oldData = ticket.toJSON();

      // Update allowed fields
      ["title", "description", "priority"].forEach((field) => {
        if (data[field] !== undefined) ticket[field] = data[field];
      });

      // Send notification
      const t1 = `Ticket Updated`;
      const message = `Your ticket "${ticket.title}" has been updated successfully.`;
      await SendNotification.sendTicketingNotification(
        ticket.restaurant_id,
        t1,
        message,
        user.id,
        user.branch_id
      );

      await ticket.save({ transaction: t });

      // Log activity
      await logActivity({
        user_id: user.id,
        module: "SupportTicket",
        action: "Update",
        details: { before: oldData, after: ticket.toJSON() },
        transaction: t,
      });

      await t.commit();
      return ticket;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  // ------------------ Update Ticket Status ------------------
  async updateTicketStatus(id, data, user) {
    const t = await sequelize.transaction();
    try {
      const { status } = data;
      const ticket = await SupportTicket.findByPk(id, { transaction: t });
      if (!ticket) throwError("Ticket not found", 404);

      const oldData = ticket.toJSON();
      ticket.status = status;

      // Send notifications
      const t1 = `Ticket Status Updated`;
      const message = `Your ticket status has been updated to "${status}".`;
      await SendNotification.sendTicketingNotification(
        ticket.restaurant_id,
        t1,
        message,
        ticket.user_id,
        ticket.branch_id
      );

      const titleAdmin = `Ticket Status Updated`;
      const messageAdmin = `The ticket "${ticket.title}" status has been updated to "${status}".`;
      await SendNotification.sendAdminNotification(titleAdmin, messageAdmin);

      await ticket.save({ transaction: t });

      // Log activity
      await logActivity({
        user_id: user.id,
        module: "SupportTicket",
        action: "Update Status",
        details: { before: oldData, after: ticket.toJSON() },
        transaction: t,
      });

      await t.commit();
      return ticket;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  // ------------------ Delete Ticket ------------------
  async deleteTicket(id, user) {
    const t = await sequelize.transaction();
    try {
      const ticket = await SupportTicket.findByPk(id, { transaction: t });
      if (!ticket) throwError("Ticket not found", 404);

      const oldData = ticket.toJSON();

      // Send notification
      const title = `Ticket Deleted`;
      const message = `Your ticket "${ticket.title}" has been deleted successfully.`;
      await SendNotification.sendTicketingNotification(
        ticket.restaurant_id,
        title,
        message,
        user.id,
        ticket.branch_id
      );

      await ticket.destroy({ transaction: t });

      // Log activity
      await logActivity({
        user_id: user.id,
        module: "SupportTicket",
        action: "Delete",
        details: oldData,
        transaction: t,
      });

      await t.commit();
      return true;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  // ------------------ Ticket KPIs ------------------
  async getTicketKPIs(user) {
    const where = {};
    if (user.restaurant_id) where.restaurant_id = user.restaurant_id;
    if (user.branch_id) where.branch_id = user.branch_id;

    const totalTickets = await SupportTicket.count({ where });
    const highPriority = await SupportTicket.count({
      where: { ...where, priority: "high" },
    });
    const mediumPriority = await SupportTicket.count({
      where: { ...where, priority: "medium" },
    });
    const lowPriority = await SupportTicket.count({
      where: { ...where, priority: "low" },
    });

    const openTickets = await SupportTicket.count({
      where: { ...where, status: "open" },
    });
    const inProgressTickets = await SupportTicket.count({
      where: { ...where, status: "in-progress" },
    });
    const closedTickets = await SupportTicket.count({
      where: { ...where, status: "closed" },
    });

    return {
      totalTickets,
      priority: {
        high: highPriority,
        medium: mediumPriority,
        low: lowPriority,
      },
      status: {
        open: openTickets,
        inProgress: inProgressTickets,
        closed: closedTickets,
      },
    };
  },
};

module.exports = TicketService;
