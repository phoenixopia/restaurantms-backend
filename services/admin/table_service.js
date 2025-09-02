"use strict";

const { Table, Branch, Restaurant, sequelize } = require("../../models");
const { Op } = require("sequelize");
const throwError = require("../../utils/throwError");
const logActivity = require("../../utils/logActivity");

const TableService = {
  // ------------------ Create Table ------------------
  async createTable(data, user) {
    const t = await sequelize.transaction();
    try {
      const branchId = user.branch_id || data.branch_id;
      if (!branchId) throwError("Branch ID is required", 400);

      let restaurantId = user.restaurant_id;
      if (user.branch_id) {
        const branch = await Branch.findByPk(user.branch_id, {
          transaction: t,
        });
        if (!branch) throwError("Branch not found", 404);
        restaurantId = branch.restaurant_id;
      }

      const existingTable = await Table.findOne({
        where: { branch_id: branchId, table_number: data.table_number },
        transaction: t,
      });
      if (existingTable)
        throwError("Table number already exists in this branch", 400);

      const table = await Table.create(
        {
          table_number: data.table_number,
          capacity: data.capacity,
          restaurant_id: restaurantId,
          branch_id: branchId,
          is_active: data.is_active ?? true,
        },
        { transaction: t }
      );

      // Log activity
      await logActivity({
        user_id: user.id,
        module: "Table",
        action: "Create",
        details: table.toJSON(),
        transaction: t,
      });

      await t.commit();
      return { message: "Table created successfully", data: table };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  // ------------------ Get Tables ------------------
  async getTables(user, query) {
    let { page = 1, limit = 10, search = "", is_active, branch_id } = query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const where = {};

    if (user.branch_id) {
      where.branch_id = user.branch_id;
    } else if (user.restaurant_id) {
      where.restaurant_id = user.restaurant_id;

      if (branch_id) {
        where.branch_id = branch_id;
      }
    }

    if (search) {
      where.table_number = { [Op.iLike]: `%${search}%` };
    }

    if (is_active !== undefined) {
      where.is_active = is_active === "true";
    }

    const { count, rows } = await Table.findAndCountAll({
      where,
      include: [
        {
          model: Branch,
          attributes: ["id", "name"],
        },
        {
          model: Restaurant,
          attributes: ["id", "restaurant_name"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit,
      offset,
      distinct: true, // ensures correct count when using include
    });

    const totalPages = Math.ceil(count / limit);

    return {
      tables: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages,
      },
    };
  },

  // ------------------ Get Table By ID ------------------
  async getTableById(tableId, user) {
    const table = await Table.findByPk(tableId, {
      include: [{ model: Branch }, { model: Restaurant }],
    });
    if (!table) throwError("Table not found", 404);

    if (user.branch_id && table.branch_id !== user.branch_id)
      throwError("Access denied", 403);
    if (user.restaurant_id && table.restaurant_id !== user.restaurant_id)
      throwError("Access denied", 403);

    return { message: "Table fetched successfully", data: table };
  },

  // ------------------ Update Table ------------------
  async updateTable(tableId, data, user) {
    const t = await sequelize.transaction();
    try {
      const table = await Table.findByPk(tableId, { transaction: t });
      if (!table) throwError("Table not found", 404);

      if (user.branch_id && table.branch_id !== user.branch_id)
        throwError("Access denied", 403);
      if (user.restaurant_id && table.restaurant_id !== user.restaurant_id)
        throwError("Access denied", 403);

      if (user.branch_id) delete data.branch_id; // branch users cannot change branch

      const oldData = table.toJSON();
      await table.update(data, { transaction: t });

      // Log activity
      await logActivity({
        user_id: user.id,
        module: "Table",
        action: "Update",
        details: { before: oldData, after: table.toJSON() },
        transaction: t,
      });

      await t.commit();
      return { message: "Table updated successfully", data: table };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  // ------------------ Delete Table ------------------
  async deleteTable(tableId, user) {
    const t = await sequelize.transaction();
    try {
      const table = await Table.findByPk(tableId, { transaction: t });
      if (!table) throwError("Table not found", 404);

      if (user.branch_id && table.branch_id !== user.branch_id)
        throwError("Access denied", 403);
      if (user.restaurant_id && table.restaurant_id !== user.restaurant_id)
        throwError("Access denied", 403);

      const oldData = table.toJSON();
      await table.destroy({ transaction: t });

      // Log activity
      await logActivity({
        user_id: user.id,
        module: "Table",
        action: "Delete",
        details: oldData,
        transaction: t,
      });

      await t.commit();
      return { message: "Table deleted successfully", data: null };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  // ------------------ Table KPI ------------------
  async getTableKPI(user, query = {}) {
    const where = {};
    if (user.branch_id) {
      where.branch_id = user.branch_id;
    } else if (user.restaurant_id) {
      if (query.branch_id) {
        const branch = await Branch.findOne({
          where: { id: query.branch_id, restaurant_id: user.restaurant_id },
        });
        if (!branch) throwError("Invalid branch for this restaurant", 403);
        where.branch_id = branch.id;
      } else {
        where.restaurant_id = user.restaurant_id;
      }
    } else {
      throwError("Access denied", 403);
    }

    const totalTables = await Table.count({ where });
    const activeTables = await Table.count({
      where: { ...where, is_active: true },
    });
    const inactiveTables = totalTables - activeTables;

    return { totalTables, activeTables, inactiveTables };
  },
};

module.exports = TableService;
