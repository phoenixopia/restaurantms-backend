"use strict";

const {
  Payment,
  User,
  Customer,
  Order,
  OrderItem,
  MenuItem,
  Restaurant,
  Branch,
  sequelize,
} = require("../../models");
const { Op } = require("sequelize");
// const { getIo } = require("../../socket");
const throwError = require("../../utils/throwError");

const TransactionService = {
  async getAllTransactions(user, query) {
    const {
      page = 1,
      limit = 10,
      branch_id,
      status,
      payment_method,
      start_date,
      end_date,
      search,
    } = query;

    const where = {};
    const orderWhere = {};

    if (user.restaurant_id) {
      where.restaurant_id = user.restaurant_id;

      if (branch_id) {
        orderWhere.branch_id = branch_id;
      }
    } else if (user.branch_id) {
      orderWhere.branch_id = user.branch_id;
    } else {
      throwError("Unauthorized: User has no restaurant or branch scope", 403);
    }

    if (status) where.status = status;
    if (payment_method) where.payment_method = payment_method;

    if (start_date && end_date) {
      where.payment_date = {
        [Op.between]: [new Date(start_date), new Date(end_date)],
      };
    }

    const offset = (page - 1) * limit;

    const { rows, count } = await Payment.findAndCountAll({
      where,
      include: [
        {
          model: Order,
          where: orderWhere,
          include: [
            {
              model: OrderItem,
              include: [MenuItem],
            },
            { model: Branch },
          ],
        },
        {
          model: User,
          attributes: [
            "id",
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "profile_picture",
          ],

          where: search
            ? {
                [Op.or]: [
                  { first_name: { [Op.iLike]: `%${search}%` } },
                  { last_name: { [Op.iLike]: `%${search}%` } },
                ],
              }
            : undefined,
          required: false,
        },
        {
          model: Customer,
          attributes: [
            "id",
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "profile_picture",
          ],

          where: search
            ? {
                [Op.or]: [
                  { first_name: { [Op.iLike]: `%${search}%` } },
                  { last_name: { [Op.iLike]: `%${search}%` } },
                ],
              }
            : undefined,
          required: false,
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["created_at", "DESC"]],
      distinct: true,
    });

    return {
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit),
      transactions: rows,
    };
  },

  async getByIdTransaction(user, id) {
    const where = { id };
    const orderWhere = {};

    if (user.restaurant_id) {
      where.restaurant_id = user.restaurant_id;
    } else if (user.branch_id) {
      orderWhere.branch_id = user.branch_id;
    } else {
      throwError("Unauthorized: User has no restaurant or branch scope", 403);
    }

    const transaction = await Payment.findOne({
      where,
      include: [
        {
          model: Order,
          where: orderWhere,
          include: [
            {
              model: OrderItem,
              include: [MenuItem],
            },
            { model: Branch },
          ],
        },
        {
          model: User,
          attributes: [
            "id",
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "profile_picture",
          ],
        },
        {
          model: Customer,
          attributes: [
            "id",
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "profile_picture",
          ],
        },
      ],
    });

    if (!transaction) {
      throwError("Transaction not found or not accessible", 404);
    }

    return transaction;
  },

  async updateTransaction(user, id, body) {
    const t = await sequelize.transaction();
    try {
      const { status } = body;

      if (!status) {
        throwError("Status is required", 400);
      }

      const validStatuses = ["pending", "completed", "failed", "cancelled"];
      if (!validStatuses.includes(status)) {
        throwError("Invalid status value", 400);
      }

      // ================= User Scope =================
      const where = { id };
      const orderWhere = {};

      if (user.restaurant_id) {
        where.restaurant_id = user.restaurant_id;
      } else if (user.branch_id) {
        orderWhere.branch_id = user.branch_id;
      } else {
        throwError("Unauthorized: User has no restaurant or branch scope", 403);
      }

      // ================= Find Transaction =================
      const transaction = await Payment.findOne({
        where,
        include: [
          {
            model: Order,
            where: orderWhere,
            attributes: ["id", "branch_id"],
          },
        ],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!transaction) {
        throwError("Transaction not found or not accessible", 404);
      }

      // ================= Update Status =================
      transaction.status = status;
      await transaction.save({ transaction: t });

      await t.commit();
      return transaction;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },
  // async deleteTransaction() {},
};

module.exports = TransactionService;
