"use strict";

const path = require("path");
const fs = require("fs");
const { Op } = require("sequelize");
const {
  MenuCategory,
  Menu,
  Branch,
  Restaurant,
  sequelize,
} = require("../models");
const throwError = require("../utils/throwError");

const SERVER_URL = process.env.SERVER_URL || "http://localhost:8000";
const UPLOADS_DIR = path.join(__dirname, "..", "uploads", "menu-categories");

const getFileUrl = (filename) =>
  filename
    ? `${SERVER_URL}/uploads/menu-categories/${encodeURIComponent(filename)}`
    : null;

const getFilePath = (filename) => path.join(UPLOADS_DIR, filename);

const MenuCategoryService = {
  // creating menu category
  async createMenuCategory({
    restaurantId,
    branchName,
    name,
    description,
    sort_order,
    is_active,
    imageFile,
    categoryTagIds = [],
  }) {
    const t = await sequelize.transaction();
    try {
      if (!name) throwError("Name is required", 400);

      const menu = await Menu.findOne({
        where: { restaurant_id: restaurantId },
      });
      if (!menu) throwError("Menu not found for this restaurant", 404);

      let branchId = null;
      if (branchName) {
        const branch = await Branch.findOne({
          where: {
            name: branchName,
            restaurant_id: restaurantId,
          },
        });
        if (!branch) throwError("Branch not found under this restaurant", 404);

        branchId = branch.id;
      }

      const category = await MenuCategory.create(
        {
          menu_id: menu.id,
          branch_id: branchId,
          name,
          description,
          image: getFileUrl(imageFile),
          sort_order,
          is_active: is_active !== undefined ? is_active : true,
        },
        { transaction: t }
      );

      if (Array.isArray(categoryTagIds) && categoryTagIds.length > 0) {
        await category.setCategoryTags(categoryTagIds, { transaction: t });
      }

      await t.commit();
      return category;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async updateMenuCategory(id, restaurantId, data, imageFile) {
    const t = await sequelize.transaction();
    try {
      const category = await MenuCategory.findByPk(id, {
        include: {
          model: Menu,
          required: true,
          where: { restaurant_id: restaurantId },
        },
      });

      if (!category) throwError("Menu category not found or unauthorized", 404);

      if (imageFile) {
        const oldImage = category.image?.split("/uploads/menu-categories/")[1];
        if (oldImage) {
          const oldPath = getFilePath(oldImage);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        category.image = getFileUrl(imageFile);
      }

      const { categoryTagIds, ...restData } = data;

      Object.assign(category, restData);
      await category.save({ transaction: t });

      if (Array.isArray(categoryTagIds)) {
        await category.setCategoryTags(categoryTagIds, { transaction: t });
      }
      await t.commit();
      return category;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async deleteMenuCategory(id, restaurantId) {
    const t = await sequelize.transaction();
    try {
      const category = await MenuCategory.findByPk(id, {
        include: {
          model: Menu,
          required: true,
          where: { restaurant_id: restaurantId },
        },
      });

      if (!category) throwError("Menu category not found or unauthorized", 404);

      category.is_active = false;
      await category.save({ transaction: t });
      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async toggleMenuCategoryActivation(id, restaurantId) {
    const t = await sequelize.transaction();
    try {
      const category = await MenuCategory.findByPk(id, {
        include: {
          model: Menu,
          required: true,
          where: { restaurant_id: restaurantId },
        },
      });

      if (!category) throwError("Menu category not found or unauthorized", 404);

      category.is_active = !category.is_active;
      await category.save({ transaction: t });
      await t.commit();
      return category;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async listMenuCategoriesByRestaurant(
    restaurantId,
    branchId = null,
    page = 1,
    limit = 10
  ) {
    const menu = await Menu.findOne({ where: { restaurant_id: restaurantId } });
    if (!menu) throwError("Menu not found", 404);

    const filters = {
      menu_id: menu.id,
    };

    if (branchId) filters.branch_id = branchId;

    return await MenuCategory.paginate({
      page,
      paginate: limit,
      where: filters,
      order: [["sort_order", "ASC"]],
    });
  },

  async getMenuCategoryById(id, restaurantId) {
    const category = await MenuCategory.findByPk(id, {
      include: {
        model: Menu,
        required: true,
        where: { restaurant_id: restaurantId },
      },
    });

    if (!category) throwError("Menu category not found or unauthorized", 404);

    return category;
  },

  async listAllCategoriesTags(page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const { count, rows } = await categoryTags.findAndCountAll({
      attributes: ["id", "name"],
      limit,
      offset,
      order: [["name", "ASC"]],
    });

    return {
      totalItems: count,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      data: rows,
    };
  },
};

module.exports = MenuCategoryService;
