"use strict";

const path = require("path");
const fs = require("fs");
const { MenuItem, MenuCategory, sequelize } = require("../../models");
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
  async createMenuItem(data, imageFile, restaurantId) {
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
      if (!menu_category_name || !name || !unit_price) {
        throwError("menu_category_id, name, and unit_price are required", 400);
      }

      const category = await MenuCategory.findOne({
        where: { id: menu_category_id },
        include: [
          {
            association: "Menu",
            where: { restaurant_id: restaurantId },
            required: true,
          },
        ],
        required: true,
        transaction: t,
      });

      if (!category)
        throwError("Menu category not found under your restaurant", 404);

      const menuItem = await MenuItem.create(
        {
          menu_category_id: category.id,
          name,
          description,
          unit_price,
          image: getFileUrl(imageFile),
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

  async listMenuItemsWithRestaurant(query, restaurantId) {
    const { categoryId, branchId, seasonal, page = 1, limit = 10 } = query;

    const filters = {};
    if (categoryId) filters.menu_category_id = categoryId;
    if (seasonal !== undefined) filters.seasonal = seasonal === "true";

    return await MenuItem.paginate({
      page,
      paginate: limit,
      where: filters,
      include: [
        {
          association: "MenuCategory",
          required: true,
          include: [
            {
              association: "Menu",
              required: true,
              where: { restaurant_id: restaurantId },
            },
            ...(branchId
              ? [
                  {
                    association: "Branch",
                    required: true,
                    where: { id: branchId },
                  },
                ]
              : []),
          ],
        },
      ],
      order: [["created_at", "DESC"]],
    });
  },

  async updateMenuItem(id, data, imageFile, restaurantId) {
    const t = await sequelize.transaction();
    try {
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

  async deleteMenuItem(id, restaurantId) {
    const t = await sequelize.transaction();
    try {
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

      item.is_active = false;
      await item.save({ transaction: t });
      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async toggleSeasonal(id, restaurantId) {
    const t = await sequelize.transaction();
    try {
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

      item.seasonal = !item.seasonal;
      await item.save({ transaction: t });
      await t.commit();
      return item;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async getSingleMenuItem(id, restaurantId) {
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
    });

    if (!item) throwError("Menu item not found or unauthorized", 404);

    return item;
  },
};

module.exports = MenuItemService;
