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
          user_id: user.id, // from middleware
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

  async getAllTickets(query) {
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
};

module.exports = TicketService;
