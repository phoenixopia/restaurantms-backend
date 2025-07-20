"use strict";

const path = require("path");
const fs = require("fs");
const { MenuItem, MenuCategory, Branch, sequelize } = require("../../models");
const { Op } = require("sequelize");
const throwError = require("../../utils/throwError");
const cleanupUploadedFiles = require("../../utils/cleanUploadedFiles");

const SERVER_URL = process.env.SERVER_URL || "http://127.0.0.1:8000";
const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads", "menu-items");

const getFileUrl = (filename) =>
  filename
    ? `${SERVER_URL}/uploads/menu-items/${encodeURIComponent(filename)}`
    : null;

const getFilePath = (filename) => path.join(UPLOADS_DIR, filename);

const MenuItemService = {
  async createMenuItem(data, imageFile, user) {
    const {
      menu_category_id,
      name,
      description,
      unit_price,
      seasonal,
      is_active,
    } = data;

    const t = await sequelize.transaction();

    try {
      if (!menu_category_id || !name || !unit_price) {
        throwError("menu_category_id, name, and unit_price are required", 400);
      }

      let restaurantId;
      if (user.role_name === "staff") {
        if (!user.branch_id)
          throwError("Branch assignment required for staff", 403);
        const branch = await Branch.findByPk(user.branch_id, {
          transaction: t,
        });
        if (!branch) throwError("Assigned branch not found", 404);
        restaurantId = branch.restaurant_id;
      } else {
        restaurantId = user.restaurant_id;
      }

      const category = await MenuCategory.findOne({
        where: { id: menu_category_id },
        include: [
          {
            model: Menu,
            where: { restaurant_id: restaurantId },
            required: true,
          },
        ],
        transaction: t,
      });

      if (!category) {
        throwError("Menu category not found under your restaurant", 404);
      }

      if (user.role_name === "staff") {
        if (category.branch_id !== user.branch_id) {
          throwError(
            "Access denied - Cannot create menu item for category outside your assigned branch",
            403
          );
        }
      }

      const menuItem = await MenuItem.create(
        {
          menu_category_id: category.id,
          name,
          description,
          unit_price,
          image: imageFile ? getFileUrl(imageFile) : null,
          seasonal: seasonal ?? false,
          is_active: is_active ?? true,
        },
        { transaction: t }
      );

      await t.commit();
      return menuItem;
    } catch (error) {
      await t.rollback();
      if (imageFile) {
        cleanupUploadedFiles(imageFile);
      }
      throw error;
    }
  },

  async listMenuItemsWithRestaurant(query, user) {
    const {
      categoryId,
      branchId: queryBranchId,
      seasonal,
      page = 1,
      limit = 10,
    } = query;
    const t = await sequelize.transaction();

    try {
      let restaurantId;
      let branchId = null;

      if (user.role_name === "staff") {
        if (!user.branch_id)
          throwError("Branch assignment required for staff", 403);

        const branch = await Branch.findByPk(user.branch_id, {
          transaction: t,
        });
        if (!branch) throwError("Assigned branch not found", 404);

        restaurantId = branch.restaurant_id;
        branchId = user.branch_id;
      } else {
        restaurantId = user.restaurant_id;

        if (queryBranchId) {
          branchId = queryBranchId;
        }
      }

      const filters = {};
      if (categoryId) filters.menu_category_id = categoryId;
      if (seasonal !== undefined) filters.seasonal = seasonal === "true";

      const includeMenuCategory = {
        association: "MenuCategory",
        required: true,
        include: [
          {
            association: "Menu",
            required: true,
            where: { restaurant_id: restaurantId },
          },
        ],
      };

      if (branchId) {
        includeMenuCategory.include.push({
          association: "Branch",
          required: true,
          where: { id: branchId },
        });
      }

      const result = await MenuItem.paginate({
        page,
        paginate: limit,
        where: filters,
        include: [includeMenuCategory],
        order: [["created_at", "DESC"]],
        transaction: t,
      });

      await t.commit();
      return result;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },
  async updateMenuItem(id, data, imageFile, user) {
    const t = await sequelize.transaction();
    try {
      let restaurantId;

      if (user.role_name === "staff") {
        if (!user.branch_id)
          throwError("Branch assignment required for staff", 403);
        const branch = await Branch.findByPk(user.branch_id, {
          transaction: t,
        });
        if (!branch) throwError("Assigned branch not found", 404);
        restaurantId = branch.restaurant_id;
      } else {
        restaurantId = user.restaurant_id;
      }

      const item = await MenuItem.findByPk(id, {
        include: {
          association: "MenuCategory",
          required: true,
          include: {
            association: "Menu",
            required: true,
            where: { restaurant_id: restaurantId },
          },
        },
        transaction: t,
      });

      if (!item) throwError("Menu item not found or unauthorized", 404);

      if (user.role_name === "staff") {
        if (item.MenuCategory.branch_id !== user.branch_id) {
          throwError(
            "Access denied - Menu item not in your assigned branch",
            403
          );
        }
      }

      if (imageFile) {
        const oldFile = item.image?.split("/uploads/menu-items/")[1];
        if (oldFile && fs.existsSync(getFilePath(oldFile))) {
          fs.unlinkSync(getFilePath(oldFile));
        }
        item.image = getFileUrl(imageFile);
      }

      Object.assign(item, data);
      await item.save({ transaction: t });
      await t.commit();

      return item;
    } catch (error) {
      await t.rollback();
      if (imageFile) {
        cleanupUploadedFiles(imageFile);
      }
      throw error;
    }
  },

  async deleteMenuItem(id, user) {
    const t = await sequelize.transaction();
    try {
      let restaurantId;

      if (user.role_name === "staff") {
        if (!user.branch_id)
          throwError("Branch assignment required for staff", 403);
        const branch = await Branch.findByPk(user.branch_id, {
          transaction: t,
        });
        if (!branch) throwError("Assigned branch not found", 404);
        restaurantId = branch.restaurant_id;
      } else {
        restaurantId = user.restaurant_id;
      }

      const item = await MenuItem.findByPk(id, {
        include: {
          association: "MenuCategory",
          required: true,
          include: {
            association: "Menu",
            required: true,
            where: { restaurant_id: restaurantId },
          },
        },
        transaction: t,
      });

      if (!item) throwError("Menu item not found or unauthorized", 404);

      if (user.role_name === "staff") {
        if (item.MenuCategory.branch_id !== user.branch_id) {
          throwError(
            "Access denied - Menu item not in your assigned branch",
            403
          );
        }
      }

      item.is_active = false;
      await item.save({ transaction: t });

      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },
  async toggleSeasonal(id, user) {
    const t = await sequelize.transaction();
    try {
      let restaurantId;

      if (user.role_name === "staff") {
        if (!user.branch_id)
          throwError("Branch assignment required for staff", 403);
        const branch = await Branch.findByPk(user.branch_id, {
          transaction: t,
        });
        if (!branch) throwError("Assigned branch not found", 404);
        restaurantId = branch.restaurant_id;
      } else {
        restaurantId = user.restaurant_id;
      }

      const item = await MenuItem.findByPk(id, {
        include: {
          association: "MenuCategory",
          required: true,
          include: {
            association: "Menu",
            required: true,
            where: { restaurant_id: restaurantId },
          },
        },
        transaction: t,
      });

      if (!item) throwError("Menu item not found or unauthorized", 404);

      if (
        user.role_name === "staff" &&
        item.MenuCategory.branch_id !== user.branch_id
      ) {
        throwError(
          "Access denied - Menu item not in your assigned branch",
          403
        );
      }

      item.seasonal = !item.seasonal;
      await item.save({ transaction: t });
      await t.commit();

      return item;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async getSingleMenuItem(id, user) {
    const t = await sequelize.transaction();

    try {
      let restaurantId;

      if (user.role_name === "staff") {
        if (!user.branch_id)
          throwError("Branch assignment required for staff", 403);
        const branch = await Branch.findByPk(user.branch_id, {
          transaction: t,
        });
        if (!branch) throwError("Assigned branch not found", 404);
        restaurantId = branch.restaurant_id;
      } else {
        restaurantId = user.restaurant_id;
      }

      const item = await MenuItem.findByPk(id, {
        include: {
          association: "MenuCategory",
          required: true,
          include: {
            association: "Menu",
            required: true,
            where: { restaurant_id: restaurantId },
          },
        },
        transaction: t,
      });

      if (!item) throwError("Menu item not found or unauthorized", 404);

      if (
        user.role_name === "staff" &&
        item.MenuCategory.branch_id !== user.branch_id
      ) {
        throwError(
          "Access denied - Menu item not in your assigned branch",
          403
        );
      }

      await t.commit();
      return item;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async toggleActivation(id, user) {
    const t = await sequelize.transaction();
    try {
      let restaurantId;

      if (user.role_name === "staff") {
        if (!user.branch_id)
          throwError("Branch assignment required for staff", 403);
        const branch = await Branch.findByPk(user.branch_id, {
          transaction: t,
        });
        if (!branch) throwError("Assigned branch not found", 404);
        restaurantId = branch.restaurant_id;
      } else {
        restaurantId = user.restaurant_id;
      }

      const item = await MenuItem.findOne({
        where: { id },
        include: {
          model: MenuCategory,
          include: {
            model: Menu,
            where: { restaurant_id: restaurantId },
            attributes: [],
          },
          attributes: [],
        },
        transaction: t,
      });

      if (!item)
        throwError("Menu item not found or not part of your restaurant", 404);

      if (
        user.role_name === "staff" &&
        item.MenuCategory.branch_id !== user.branch_id
      ) {
        throwError(
          "Access denied - Menu item not in your assigned branch",
          403
        );
      }

      item.is_active = !item.is_active;
      await item.save({ transaction: t });
      await t.commit();

      return item;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },
};

module.exports = MenuItemService;
