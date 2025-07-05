"use strict";

const path = require("path");
const fs = require("fs");
const { Op } = require("sequelize");
const {
  MenuCategory,
  Menu,
  Branch,
  Restaurant,
  CategoryTag,
  sequelize,
} = require("../../models");
const throwError = require("../../utils/throwError");

const MenuCategoryService = {
  async createMenuCategory({
    restaurantId,
    branchName,
    name,
    description,
    sort_order,
    is_active,
    categoryTagIds = [],
  }) {
    const t = await sequelize.transaction();
    try {
      if (!name) throwError("Name is required", 400);

      const menu = await Menu.findOne({
        where: { restaurant_id: restaurantId },
        transaction: t,
      });
      if (!menu) throwError("Menu not found for this restaurant", 404);

      let branchId = null;
      if (branchName) {
        const branch = await Branch.findOne({
          where: {
            name: branchName,
            restaurant_id: restaurantId,
          },
          transaction: t,
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
        transaction: t,
      });

      if (!category) throwError("Menu category not found or unauthorized", 404);

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
        transaction: t,
      });

      if (!category) throwError("Menu category not found or unauthorized", 404);

      await category.destroy({ transaction: t });
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
        transaction: t,
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

  async listMenuCategoriesUnderRestaurant(
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

  async getRestaurantsByCategoryTagId(categoryTagId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const { count, rows } = await Restaurant.findAndCountAll({
      distinct: true,
      attributes: ["id", "restaurant_name", "logo_url"],
      include: [
        {
          model: Menu,
          attributes: ["id", "name"],
          include: [
            {
              model: MenuCategory,
              attributes: ["id", "name"],
              include: [
                {
                  association: "CategoryTag",
                  where: { id: categoryTagId },
                  attributes: ["id", "name"],
                  required: true,
                },
              ],
              required: true,
            },
          ],
          required: true,
        },
      ],
      where: {
        status: {
          [Op.or]: ["active", "trial"],
        },
      },
      offset,
      limit,
    });

    return {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: rows,
    };
  },
};

module.exports = MenuCategoryService;
