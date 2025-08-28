"use strict";

const { SupportTicket, sequelize } = require("../../models");
const { Op } = require("sequelize");
const throwError = require("../../utils/throwError");

const TicketService = {
  async createTicket(data, user) {
    const t = await sequelize.transaction();
    try {
      const { title, description, priority } = data;

      if (!title) throwError("Title is required", 400);
      if (!description) throwError("Description is required", 400);

      const ticket = await SupportTicket.create(
        {
          user_id: user.id,
          restaurant_id: user.restaurant_id || null,
          branch_id: user.branch_id || null,
          title,
          description,
          priority,
        },
        { transaction: t }
      );

      await t.commit();
      return ticket;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async getAllTickets(query, user) {
    let {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "created_at",
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
    });

    return {
      total: count,
      tickets: rows,
      page,
      totalPages: Math.ceil(count / limit),
    };
  },

  async getTicketById(id) {
    const ticket = await SupportTicket.findByPk(id);
    if (!ticket) throwError("Ticket not found", 404);
    return ticket;
  },

  async updateTicketStatus(id, data) {
    const t = await sequelize.transaction();
    try {
      const { status, priority } = data;
      const ticket = await SupportTicket.findByPk(id, { transaction: t });
      if (!ticket) throwError("Ticket not found", 404);

      ticket.status = status;
      ticket.priority = priority;
      await ticket.save({ transaction: t });

      await t.commit();
      return ticket;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async deleteTicket(id) {
    const t = await sequelize.transaction();
    try {
      const ticket = await SupportTicket.findByPk(id, { transaction: t });
      if (!ticket) throwError("Ticket not found", 404);

      await ticket.destroy({ transaction: t });
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
