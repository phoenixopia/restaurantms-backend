"use strict";

const {
  Inventory,
  InventoryTransaction,
  Branch,
  Restaurant,
  sequelize,
} = require("../../models");
const { Op, col } = require("sequelize");
const throwError = require("../../utils/throwError");
const SendNotification = require("../../utils/send_notification");
const logActivity = require("../../utils/logActivity");

const InventoryService = {
  // ------------------ List Inventory ------------------
  async listAllInventory(
    user,
    {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      order = "DESC",
      branchId = null,
    }
  ) {
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const searchCondition = search
      ? { name: { [Op.iLike]: `%${search}%` } }
      : {};
    const orderCondition = [[sortBy, order.toUpperCase()]];
    let where = { ...searchCondition };

    if (user.restaurant_id) {
      if (branchId) {
        const branch = await Branch.findOne({
          where: { id: branchId, restaurant_id: user.restaurant_id },
        });
        if (!branch) throwError("Invalid branchId for this restaurant.", 403);
        where.branch_id = branchId;
      } else {
        where.restaurant_id = user.restaurant_id;
      }
    } else if (user.branch_id) {
      where.branch_id = user.branch_id;
    } else {
      throwError("Access denied", 403);
    }

    const { count, rows } = await Inventory.findAndCountAll({
      where,
      order: orderCondition,
      limit,
      offset,
    });

    return {
      items: rows,
      meta: {
        totalItems: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
      },
    };
  },

  // ------------------ Get Single Inventory ------------------
  async getInventory(user, id) {
    const item = await Inventory.findByPk(id, {
      include: [{ model: InventoryTransaction, as: "transactions" }],
    });
    if (!item) throwError("Inventory item not found", 404);

    if (
      (user.restaurant_id && item.restaurant_id !== user.restaurant_id) ||
      (user.branch_id && item.branch_id !== user.branch_id)
    )
      throwError("You are not authorized to view this inventory item", 403);

    return item;
  },

  // ------------------ Create Inventory ------------------
  async createInventory(
    user,
    { branch_id, name, unit, quantity = 0, threshold = 0 }
  ) {
    const t = await sequelize.transaction();
    try {
      let finalBranchId, restaurantId;

      if (user.restaurant_id) {
        if (!branch_id)
          throwError("Branch ID is required for restaurant-level users", 400);
        const branch = await Branch.findOne({
          where: { id: branch_id, restaurant_id: user.restaurant_id },
          transaction: t,
        });
        if (!branch) throwError("Invalid branch_id for this restaurant", 403);
        finalBranchId = branch.id;
        restaurantId = user.restaurant_id;
      } else if (user.branch_id) {
        finalBranchId = user.branch_id;
        const branch = await Branch.findByPk(finalBranchId, { transaction: t });
        if (!branch) throwError("Branch not found", 404);
        restaurantId = branch.restaurant_id;
      } else {
        throwError("Access denied", 403);
      }

      const item = await Inventory.create(
        {
          restaurant_id: restaurantId,
          branch_id: finalBranchId,
          name,
          unit,
          quantity,
          threshold,
        },
        { transaction: t }
      );

      if (quantity > 0) {
        await InventoryTransaction.create(
          {
            inventory_id: item.id,
            type: "in",
            quantity,
            reason: "initial stock",
          },
          { transaction: t }
        );
      }

      const title = `New Inventory Added`;
      const message = `Item "${item.name}" has been added to your branch.`;
      await SendNotification.sendInventoryNotification(
        finalBranchId,
        title,
        message,
        user?.id
      );

      // Log activity
      await logActivity({
        user_id: user.id,
        module: "Inventory",
        action: "Create",
        details: item.toJSON(),
        transaction: t,
      });

      await t.commit();
      return item;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  // ------------------ Update Inventory ------------------
  async updateInventory(user, id, { name, quantity, threshold }) {
    const t = await sequelize.transaction();
    try {
      const item = await Inventory.findByPk(id, { transaction: t });
      if (!item) throwError("Inventory item not found", 404);

      if (
        (user.restaurant_id && item.restaurant_id !== user.restaurant_id) ||
        (user.branch_id && item.branch_id !== user.branch_id)
      )
        throwError("You are not authorized to update this inventory item", 403);

      const oldData = item.toJSON();
      item.name = name ?? item.name;
      item.quantity = quantity ?? item.quantity;
      item.threshold = threshold ?? item.threshold;

      await item.save({ transaction: t });

      const title = `Inventory Updated`;
      const message = `Item "${item.name}" has been updated successfully`;
      await SendNotification.sendInventoryNotification(
        item.branch_id,
        title,
        message,
        user?.id
      );

      // Log activity
      await logActivity({
        user_id: user.id,
        module: "Inventory",
        action: "Update",
        details: { before: oldData, after: item.toJSON() },
        transaction: t,
      });

      await t.commit();
      return item;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  // ------------------ Delete Inventory ------------------
  async deleteInventory(user, id) {
    const t = await sequelize.transaction();
    try {
      const item = await Inventory.findByPk(id, { transaction: t });
      if (!item) throwError("Inventory item not found", 404);

      if (
        (user.restaurant_id && item.restaurant_id !== user.restaurant_id) ||
        (user.branch_id && item.branch_id !== user.branch_id)
      )
        throwError("You are not authorized to delete this inventory item", 403);

      const oldData = item.toJSON();
      await InventoryTransaction.destroy({
        where: { inventory_id: item.id },
        transaction: t,
      });
      await item.destroy({ transaction: t });

      const title = `Inventory Deleted`;
      const message = `Item "${item.name}" has been deleted successfully`;
      await SendNotification.sendInventoryNotification(
        item.branch_id,
        title,
        message,
        user?.id
      );

      // Log activity
      await logActivity({
        user_id: user.id,
        module: "Inventory",
        action: "Delete",
        details: oldData,
        transaction: t,
      });

      await t.commit();
      return {
        message: "Inventory item and related transactions deleted successfully",
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  // ------------------ Adjust Inventory ------------------
  async adjustInventory(user, id, { type, quantity, reason }) {
    const t = await sequelize.transaction();
    try {
      const item = await Inventory.findByPk(id, { transaction: t });
      if (!item) throwError("Inventory item not found", 404);

      if (
        (user.restaurant_id && item.restaurant_id !== user.restaurant_id) ||
        (user.branch_id && item.branch_id !== user.branch_id)
      )
        throwError("You are not authorized to adjust this inventory item", 403);

      const oldData = item.toJSON();
      let newQty = Number(item.quantity);
      if (type === "in") newQty += Number(quantity);
      if (type === "out" || type === "wastage") newQty -= Number(quantity);
      if (newQty < 0) throwError("Insufficient stock", 400);

      if (newQty < item.threshold) {
        await SendNotification.sendInventoryNotification(
          item.branch_id,
          `Low Stock`,
          `Item "${item.name}" has low stock`,
          user?.id
        );
      }

      await item.update({ quantity: newQty }, { transaction: t });
      await InventoryTransaction.create(
        { inventory_id: item.id, type, quantity, reason },
        { transaction: t }
      );

      await SendNotification.sendInventoryNotification(
        item.branch_id,
        `Inventory Adjusted`,
        `Item "${item.name}" has been ${type} by ${quantity} units. Reason: ${
          reason || "N/A"
        }`,
        user?.id
      );

      // Log activity
      await logActivity({
        user_id: user.id,
        module: "Inventory",
        action: "Adjust",
        details: { before: oldData, after: item.toJSON() },
        transaction: t,
      });

      await t.commit();
      return item;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  // ------------------ Inventory KPIs ------------------
  async getKpis(user, branchId = null) {
    let where = {};

    if (user.restaurant_id) {
      if (branchId) {
        const branch = await Branch.findOne({
          where: { id: branchId, restaurant_id: user.restaurant_id },
        });
        if (!branch) throwError("Invalid branch for this restaurant", 403);
        where.branch_id = branch.id;
      } else {
        where.restaurant_id = user.restaurant_id;
      }
    } else if (user.branch_id) {
      where.branch_id = user.branch_id;
    } else throwError("Access denied", 403);

    const totalStockItems = await Inventory.count({ where });
    const availableItems = await Inventory.count({
      where: { ...where, quantity: { [Op.gt]: col("threshold") } },
    });
    const lowStockItems = await Inventory.count({
      where: {
        ...where,
        [Op.and]: [
          { quantity: { [Op.lte]: col("threshold") } },
          { quantity: { [Op.gt]: 0 } },
        ],
      },
    });
    const outOfStockItems = await Inventory.count({
      where: { ...where, quantity: 0 },
    });

    return { totalStockItems, availableItems, lowStockItems, outOfStockItems };
  },

  // ------------------ Inventory Transaction KPIs ------------------
  async getInventoryTransactionKpis(user, branchId = null) {
    const inventoryWhere = {};
    if (user.restaurant_id) {
      if (branchId) {
        const branch = await Branch.findOne({
          where: { id: branchId, restaurant_id: user.restaurant_id },
        });
        if (!branch) throwError("Invalid branch for this restaurant", 403);
        inventoryWhere.branch_id = branch.id;
        inventoryWhere.restaurant_id = user.restaurant_id;
      } else {
        inventoryWhere.restaurant_id = user.restaurant_id;
      }
    } else if (user.branch_id) {
      const branch = await Branch.findByPk(user.branch_id);
      if (!branch) throwError("Branch not found", 404);
      inventoryWhere.branch_id = branch.id;
      inventoryWhere.restaurant_id = branch.restaurant_id;
    } else throwError("Access denied", 403);

    const include = [
      {
        model: Inventory,
        as: "inventory",
        where: inventoryWhere,
        attributes: [],
      },
    ];
    const allStockTransaction = await InventoryTransaction.count({ include });
    const stockIn = await InventoryTransaction.count({
      where: { type: "in" },
      include,
    });
    const stockOut = await InventoryTransaction.count({
      where: { type: "out" },
      include,
    });
    const stockWastage = await InventoryTransaction.count({
      where: { type: "wastage" },
      include,
    });

    return { allStockTransaction, stockIn, stockOut, stockWastage };
  },

  // ------------------ List Inventory Transactions ------------------
  async listInventoryTransactions(
    user,
    {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      order = "DESC",
      branchId = null,
    }
  ) {
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const inventoryWhere = {};

    if (user.restaurant_id) {
      if (branchId) {
        const branch = await Branch.findOne({
          where: { id: branchId, restaurant_id: user.restaurant_id },
        });
        if (!branch) throwError("Invalid branch for this restaurant", 403);
        inventoryWhere.branch_id = branch.id;
        inventoryWhere.restaurant_id = user.restaurant_id;
      } else {
        inventoryWhere.restaurant_id = user.restaurant_id;
      }
    } else if (user.branch_id) {
      const branch = await Branch.findByPk(user.branch_id);
      if (!branch) throwError("Branch not found", 404);
      inventoryWhere.branch_id = branch.id;
      inventoryWhere.restaurant_id = branch.restaurant_id;
    } else {
      throwError("Access denied", 403);
    }

    const includeCondition = {
      model: Inventory,
      as: "inventory",
      attributes: ["id", "name", "restaurant_id", "branch_id"],
      where: {
        ...inventoryWhere,
        ...(search ? { name: { [Op.iLike]: `%${search}%` } } : {}),
      },
      required: true,
    };

    const orderCondition = [[sortBy, order.toUpperCase()]];

    const { count, rows } = await InventoryTransaction.findAndCountAll({
      include: [includeCondition],
      order: orderCondition,
      limit,
      offset,
    });

    const data = rows.map((item) => ({
      id: item.id,
      inventory_id: item.inventory_id,
      inventory_name: item.inventory?.name,
      type: item.type,
      quantity: item.quantity,
      reason: item.reason,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return {
      items: data,
      meta: {
        totalItems: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
      },
    };
  },
};

module.exports = InventoryService;
