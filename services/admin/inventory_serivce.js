const {
  Inventory,
  InventoryTransaction,
  Branch,
  sequelize,
} = require("../../models");
const { Op, fn, col } = require("sequelize");
const throwError = require("../../utils/throwError");

const InventoryService = {
  async listAllInventory(
    user,
    {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "created_at",
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
    if (!rows || rows.length === 0)
      throwError("No inventory items found.", 404);

    return {
      items: rows,
      meta: {
        totalItems: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
      },
    };
  },

  async createInventory(
    user,
    { branch_id, name, unit, quantity = 0, threshold = 0 }
  ) {
    const t = await sequelize.transaction();
    try {
      let finalBranchId, restaurantId;

      if (user.restaurant_id) {
        if (!branch_id)
          throwError("branch id is required for restaurant-level users", 400);
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

      await t.commit();
      return item;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async updateInventory(user, id, { name, quantity, threshold }) {
    const t = await sequelize.transaction();
    try {
      const item = await Inventory.findByPk(id, { transaction: t });
      if (!item) throwError("Inventory item not found", 404);

      if (user.restaurant_id && item.restaurant_id !== user.restaurant_id)
        throwError("You are not authorized to update this inventory item", 403);
      if (user.branch_id && item.branch_id !== user.branch_id)
        throwError("You are not authorized to update this inventory item", 403);

      item.name = name ?? item.name;
      item.quantity = quantity ?? item.quantity;
      item.threshold = threshold ?? item.threshold;

      await item.save({ transaction: t });
      await t.commit();
      return item;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async deleteInventory(user, id) {
    const t = await sequelize.transaction();
    try {
      const item = await Inventory.findByPk(id, { transaction: t });
      if (!item) throwError("Inventory item not found", 404);

      if (user.restaurant_id && item.restaurant_id !== user.restaurant_id)
        throwError("You are not authorized to delete this inventory item", 403);
      if (user.branch_id && item.branch_id !== user.branch_id)
        throwError("You are not authorized to delete this inventory item", 403);

      await InventoryTransaction.destroy({
        where: { inventory_id: item.id },
        transaction: t,
      });
      await item.destroy({ transaction: t });

      await t.commit();
      return {
        message: "Inventory item and related transactions deleted successfully",
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async adjustInventory(user, id, { type, quantity, reason }) {
    const t = await sequelize.transaction();
    try {
      const item = await Inventory.findByPk(id, { transaction: t });
      if (!item) throwError("Inventory item not found", 404);

      if (user.restaurant_id && item.restaurant_id !== user.restaurant_id)
        throwError("You are not authorized to adjust this inventory item", 403);
      if (user.branch_id && item.branch_id !== user.branch_id)
        throwError("You are not authorized to adjust this inventory item", 403);

      let newQty = Number(item.quantity);
      if (type === "in") newQty += Number(quantity);
      if (type === "out" || type === "wastage") newQty -= Number(quantity);
      if (newQty < 0) throwError("Insufficient stock", 400);

      await item.update({ quantity: newQty }, { transaction: t });
      await InventoryTransaction.create(
        { inventory_id: item.id, type, quantity, reason },
        { transaction: t }
      );

      await t.commit();
      return item;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

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
    } else {
      throwError("Access denied", 403);
    }

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

    return {
      totalStockItems,
      availableItems,
      lowStockItems,
      outOfStockItems,
    };
  },

  async getInventoryTransactionKpis(user, branchId = null) {
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
    } else {
      throwError("Access denied", 403);
    }

    const allStockTransaction = await InventoryTransaction.count({ where });
    const stockIn = await InventoryTransaction.count({
      where: { ...where, type: "in" },
    });
    const stockOut = await InventoryTransaction.count({
      where: { ...where, type: "out" },
    });
    const stockAdjust = await InventoryTransaction.count({
      where: { ...where, type: "adjust" },
    });

    return {
      allStockTransaction,
      stockIn,
      stockOut,
      stockAdjust,
    };
  },

  async listInventoryTransactions(
    user,
    { page, limit, search, sortBy, order, branchId }
  ) {
    const offset = (page - 1) * limit;
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

    const includeCondition = {
      model: Inventory,
      as: "inventory",
      attributes: ["id", "name"],
      where: search ? { name: { [Op.iLike]: `%${search}%` } } : {},
      required: !!search,
    };
    const orderCondition = [[sortBy, order.toUpperCase()]];

    const { count, rows } = await InventoryTransaction.findAndCountAll({
      include: [includeCondition],
      where,
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
      created_at: item.created_at,
      updated_at: item.updated_at,
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
