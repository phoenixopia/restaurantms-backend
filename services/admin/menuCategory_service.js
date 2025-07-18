"use strict";

const { Op } = require("sequelize");
const {
  MenuCategory,
  Menu,
  Branch,
  Restaurant,
  MenuItem,
  CategoryTag,
  sequelize,
} = require("../../models");
const throwError = require("../../utils/throwError");
const { buildPagination } = require("../../utils/pagination");

const MenuCategoryService = {
  async createMenuCategory({
    restaurantId,
    user,
    branchId = null,
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

      let finalBranchId = null;

      if (user.role_name === "staff") {
        if (!user.branch_id) {
          throwError("Branch assignment required for staff", 403);
        }
        if (branchId && branchId !== user.branch_id) {
          throwError(
            "Staff can only create categories under their assigned branch",
            403
          );
        }
        finalBranchId = user.branch_id;
      } else {
        if (branchId) {
          const branch = await Branch.findOne({
            where: {
              id: branchId,
              restaurant_id: restaurantId,
            },
            transaction: t,
          });
          if (!branch) {
            throwError("Branch not found under this restaurant", 404);
          }
          finalBranchId = branchId;
        }
      }

      const category = await MenuCategory.create(
        {
          menu_id: menu.id,
          branch_id: finalBranchId,
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

  async updateMenuCategory(id, user, data) {
    const t = await sequelize.transaction();
    try {
      let restaurantId;

      if (user.role_name === "staff") {
        if (!user.branch_id) {
          throwError("Branch assignment required for staff", 403);
        }

        const branch = await Branch.findByPk(user.branch_id, {
          transaction: t,
        });
        if (!branch) throwError("Assigned branch not found", 404);
        restaurantId = branch.restaurant_id;
      } else {
        restaurantId = user.restaurant_id;
      }

      const category = await MenuCategory.findByPk(id, {
        include: {
          model: Menu,
          required: true,
          where: { restaurant_id: restaurantId },
        },
        transaction: t,
      });

      if (!category) throwError("Menu category not found or unauthorized", 404);

      if (user.role_name === "staff") {
        if (category.branch_id !== user.branch_id) {
          throwError(
            "Access denied - You can only update categories in your assigned branch",
            403
          );
        }
      } else {
        if (data.branch_id && data.branch_id !== category.branch_id) {
          const newBranch = await Branch.findOne({
            where: {
              id: data.branch_id,
              restaurant_id: restaurantId,
            },
            transaction: t,
          });
          if (!newBranch)
            throwError("Branch not found under this restaurant", 404);
        }
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

  async deleteMenuCategory(id, user) {
    const t = await sequelize.transaction();
    try {
      let restaurantId;

      if (user.role_name === "staff") {
        if (!user.branch_id) {
          throwError("Branch assignment required for staff", 403);
        }
        const branch = await Branch.findByPk(user.branch_id, {
          transaction: t,
        });
        if (!branch) throwError("Assigned branch not found", 404);
        restaurantId = branch.restaurant_id;
      } else {
        restaurantId = user.restaurant_id;
      }

      const category = await MenuCategory.findByPk(id, {
        include: {
          model: Menu,
          required: true,
          where: { restaurant_id: restaurantId },
        },
        transaction: t,
      });

      if (!category) throwError("Menu category not found or unauthorized", 404);

      if (user.role_name === "staff") {
        if (category.branch_id !== user.branch_id) {
          throwError(
            "Access denied - You can only delete categories in your assigned branch",
            403
          );
        }
      }

      await category.destroy({ transaction: t });
      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async toggleMenuCategoryActivation(id, user) {
    const t = await sequelize.transaction();
    try {
      let restaurantId;

      if (user.role_name === "staff") {
        if (!user.branch_id) {
          throwError("Branch assignment required for staff", 403);
        }
        const branch = await Branch.findByPk(user.branch_id, {
          transaction: t,
        });
        if (!branch) throwError("Assigned branch not found", 404);
        restaurantId = branch.restaurant_id;
      } else {
        restaurantId = user.restaurant_id;
      }

      const category = await MenuCategory.findByPk(id, {
        include: {
          model: Menu,
          required: true,
          where: { restaurant_id: restaurantId },
        },
        transaction: t,
      });

      if (!category) throwError("Menu category not found or unauthorized", 404);

      if (user.role_name === "staff") {
        if (category.branch_id !== user.branch_id) {
          throwError(
            "Access denied - You can only toggle categories in your assigned branch",
            403
          );
        }
      }

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
    user,
    branchId = null,
    page = 1,
    limit = 10
  ) {
    let restaurantId;
    let effectiveBranchId = branchId;

    if (user.role_name === "restaurant_admin") {
      restaurantId = user.restaurant_id;
    } else if (user.role_name === "staff") {
      if (!user.branch_id) throwError("Branch not assigned to staff user", 403);
      restaurantId = null;
      effectiveBranchId = user.branch_id;
    } else {
      throwError("Unauthorized role", 403);
    }

    if (!restaurantId && effectiveBranchId) {
      const branch = await Branch.findByPk(effectiveBranchId);
      if (!branch) throwError("Branch not found", 404);
      restaurantId = branch.restaurant_id;
    }

    const menu = await Menu.findOne({ where: { restaurant_id: restaurantId } });
    if (!menu) throwError("Menu not found", 404);

    const filters = {
      menu_id: menu.id,
    };

    if (effectiveBranchId) {
      filters.branch_id = effectiveBranchId;
    }

    const { offset, order } = buildPagination({ page, limit });

    const finalOrder = [["sort_order", "ASC"]];

    const { count, rows } = await MenuCategory.findAndCountAll({
      where: filters,
      include: [
        {
          model: MenuItem,
          attributes: { exclude: ["created_at", "updated_at"] },
        },
      ],
      order: finalOrder,
      limit,
      offset,
    });

    return {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: rows,
    };
  },

  async getMenuCategoryById(id, user) {
    const restaurantId =
      user.role_name === "staff" && user.branch_id
        ? await getRestaurantIdByBranchId(user.branch_id)
        : user.restaurant_id;

    async function getRestaurantIdByBranchId(branchId) {
      const branch = await Branch.findByPk(branchId);
      if (!branch) throwError("Branch not found", 404);
      return branch.restaurant_id;
    }

    const category = await MenuCategory.findByPk(id, {
      include: {
        model: Menu,
        required: true,
        where: { restaurant_id: restaurantId },
        include: [
          {
            model: MenuItem,
            attributes: { exclude: ["created_at", "updated_at"] },
          },
        ],
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
