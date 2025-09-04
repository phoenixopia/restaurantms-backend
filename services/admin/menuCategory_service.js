"use strict";

const { Op } = require("sequelize");
const {
  MenuCategory,
  Menu,
  Branch,
  Restaurant,
  SystemSetting,
  MenuItem,
  CategoryTag,
  Location,
  MenuCategoryTags,
  sequelize,
} = require("../../models");
const throwError = require("../../utils/throwError");
const { buildPagination } = require("../../utils/pagination");
const ReviewService = require("./review_service");
const logActivity = require("../../utils/logActivity");

const MenuCategoryService = {
  async createMenuCategory(user, data) {
    const t = await sequelize.transaction();
    try {
      let finalRestaurantId;
      let finalBranchId;

      if (user.restaurant_id) {
        if (!data.branchId) {
          throwError("Branch ID is required for creating category", 400);
        }

        const branch = await Branch.findOne({
          where: { id: data.branchId, restaurant_id: user.restaurant_id },
          transaction: t,
        });
        if (!branch) throwError("Invalid branch for this restaurant", 403);

        finalRestaurantId = user.restaurant_id;
        finalBranchId = branch.id;
      } else if (user.branch_id) {
        finalBranchId = user.branch_id;
        const branch = await Branch.findByPk(user.branch_id, {
          transaction: t,
        });
        if (!branch) throwError("Branch not found", 404);

        finalRestaurantId = branch.restaurant_id;
      } else {
        throwError("User must belong to a restaurant or branch", 400);
      }

      const category = await MenuCategory.create(
        {
          restaurant_id: finalRestaurantId,
          branch_id: finalBranchId,
          menu_id: data.menu_id,
          name: data.name,
          description: data.description,
          sort_order: data.sort_order,
          is_active: data.is_active ?? true,
        },
        { transaction: t }
      );

      if (data.tags_ids?.length) {
        await category.setCategoryTags(data.tags_ids, { transaction: t });
      }

      await logActivity({
        user_id: user.id,
        module: "MenuCategory",
        action: "Create",
        details: category.toJSON(),
        transaction: t,
      });

      await t.commit();
      return category;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async updateMenuCategory(categoryId, user, data) {
    const t = await sequelize.transaction();
    try {
      const category = await MenuCategory.findByPk(categoryId, {
        transaction: t,
      });
      if (!category) throwError("Menu category not found", 404);

      const oldData = category.toJSON();

      let finalRestaurantId;
      let finalBranchId;

      if (user.restaurant_id) {
        if (category.restaurant_id !== user.restaurant_id) {
          throwError("Not authorized to update this category", 403);
        }

        finalRestaurantId = user.restaurant_id;

        if (data.branchId) {
          const branch = await Branch.findByPk(data.branchId, {
            transaction: t,
          });
          if (!branch || branch.restaurant_id !== user.restaurant_id) {
            throwError("Branch not found under your restaurant", 403);
          }
          finalBranchId = branch.id;
        } else {
          // Keep existing branch if none provided
          finalBranchId = category.branch_id;
        }
      } else if (user.branch_id) {
        if (category.branch_id !== user.branch_id) {
          throwError("Not authorized to update this category", 403);
        }

        const branch = await Branch.findByPk(user.branch_id, {
          transaction: t,
        });
        if (!branch) throwError("Branch not found", 404);

        finalRestaurantId = branch.restaurant_id;
        finalBranchId = branch.id;
      } else {
        throwError("User must belong to a restaurant or branch", 400);
      }

      if (data.name) {
        const duplicate = await MenuCategory.findOne({
          where: {
            name: data.name,
            restaurant_id: finalRestaurantId,
            branch_id: finalBranchId,
            id: { [Op.ne]: categoryId }, // exclude current category
          },
          transaction: t,
        });

        if (duplicate) {
          throwError(
            "A menu category with this name already exists in the selected branch",
            409
          );
        }
      }

      await category.update(
        {
          name: data.name ?? category.name,
          description: data.description ?? category.description,
          sort_order: data.sort_order ?? category.sort_order,
          is_active:
            typeof data.is_active !== "undefined"
              ? data.is_active
              : category.is_active,
          menu_id: data.menu_id ?? category.menu_id,
          restaurant_id: finalRestaurantId,
          branch_id: finalBranchId,
        },
        { transaction: t }
      );

      if (Array.isArray(data.tags_ids)) {
        await category.setCategoryTags(data.tags_ids, { transaction: t });
      }

      await logActivity({
        user_id: user.id,
        module: "MenuCategory",
        action: "Update",
        details: { before: oldData, after: category.toJSON() },
        transaction: t,
      });

      await t.commit();
      return category;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async deleteMenuCategory(categoryId, user) {
    const t = await sequelize.transaction();
    try {
      const category = await MenuCategory.findByPk(categoryId, {
        transaction: t,
      });
      if (!category) throwError("Menu category not found", 404);

      if (user.restaurant_id) {
        if (category.restaurant_id !== user.restaurant_id) {
          throwError("Not authorized to delete this category", 403);
        }
      } else if (user.branch_id) {
        if (category.branch_id !== user.branch_id) {
          throwError("Not authorized to delete this category", 403);
        }
      } else {
        throwError("User must belong to a restaurant or branch", 400);
      }

      await MenuItem.destroy({
        where: { menu_category_id: categoryId },
        transaction: t,
      });

      await MenuCategoryTags.destroy({
        where: { menu_category_id: categoryId },
        transaction: t,
      });

      await logActivity({
        user_id: user.id,
        module: "MenuCategory",
        action: "Delete",
        details: category.toJSON(),
        transaction: t,
      });

      await category.destroy({ transaction: t });

      await t.commit();
      return true;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async toggleMenuCategoryActivation(categoryId, user) {
    const t = await sequelize.transaction();
    try {
      const category = await MenuCategory.findByPk(categoryId, {
        transaction: t,
      });
      if (!category) throwError("Menu category not found", 404);

      if (user.restaurant_id) {
        if (category.restaurant_id !== user.restaurant_id) {
          throwError("Not authorized to toggle this category", 403);
        }
      } else if (user.branch_id) {
        if (category.branch_id !== user.branch_id) {
          throwError("Not authorized to toggle this category", 403);
        }
      } else {
        throwError("User must belong to a restaurant or branch", 400);
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
    page = 1,
    limit = 10,
    filters = {}
  ) {
    let restaurantId = null;
    let branchFilter = null;

    if (user.restaurant_id) {
      restaurantId = user.restaurant_id;
      if (filters.branch_id) branchFilter = filters.branch_id;
    } else if (user.branch_id) {
      const branch = await Branch.findByPk(user.branch_id);
      if (!branch) throwError("Branch not found", 404);
      restaurantId = branch.restaurant_id;
      branchFilter = branch.id;
    } else {
      throwError("User does not belong to a restaurant or branch", 403);
    }

    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) throwError("Restaurant not found", 404);

    const whereClause = { restaurant_id: restaurantId };
    if (branchFilter) whereClause.branch_id = branchFilter;
    if (filters.name) whereClause.name = { [Op.iLike]: `%${filters.name}%` };
    if (filters.dateRange === "weekly") {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - 7);
      whereClause.created_at = { [Op.gte]: startOfWeek };
    } else if (filters.dateRange === "monthly") {
      const startOfMonth = new Date();
      startOfMonth.setMonth(startOfMonth.getMonth() - 1);
      whereClause.created_at = { [Op.gte]: startOfMonth };
    }

    const offset = (page - 1) * limit;

    const { rows, count } = await MenuCategory.findAndCountAll({
      where: whereClause,
      include: [
        { model: Branch, attributes: ["id", "name"] },
        { model: Restaurant, attributes: ["id", "restaurant_name"] },
        {
          model: MenuItem,
        },
        {
          model: CategoryTag,
          attributes: ["id", "name"],
          through: { attributes: [] },
        },
      ],
      attributes: {
        include: [
          [
            sequelize.literal(`(
              SELECT COUNT(*) 
              FROM menu_items AS mi 
              WHERE mi.menu_category_id = "MenuCategory"."id"
            )`),
            "menu_items_count",
          ],
        ],
      },
      order:
        filters.sortBy === "menu_items_count"
          ? [
              [
                sequelize.literal('"menu_items_count"'),
                filters.sortOrder || "DESC",
              ],
            ]
          : [["created_at", "DESC"]],
      offset,
      limit,
      distinct: true,
    });

    let filteredRows = rows;
    if (filters.min_items || filters.max_items) {
      filteredRows = rows.filter((row) => {
        const count = parseInt(row.getDataValue("menu_items_count"), 10);
        if (filters.min_items && count < filters.min_items) return false;
        if (filters.max_items && count > filters.max_items) return false;
        return true;
      });
    }

    return {
      total: count,
      page,
      limit,
      data: filteredRows,
    };
  },

  async getMenuCategoryById(categoryId, user) {
    let whereClause = { id: categoryId };

    if (user.restaurant_id) {
      whereClause.restaurant_id = user.restaurant_id;
    } else if (user.branch_id) {
      whereClause.branch_id = user.branch_id;
    } else {
      throwError("User does not belong to a restaurant or branch", 403);
    }

    const category = await MenuCategory.findOne({
      where: whereClause,
      include: [
        {
          model: MenuItem,
        },
        { model: Branch, attributes: ["id", "name"] },
        { model: Restaurant, attributes: ["id", "restaurant_name"] },
      ],
    });

    if (!category) throwError("Menu category not found or access denied", 404);

    const menuItemsCount = await MenuItem.count({
      where: { menu_category_id: category.id },
    });

    return {
      ...category.toJSON(),
      menu_items_count: menuItemsCount,
    };
  },

  async listAllCategoriesTags(page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const { count, rows } = await CategoryTag.findAndCountAll({
      attributes: ["id", "name"],
      limit,
      offset,
      order: [["name", "ASC"]],
    });

    return {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: rows,
    };
  },

  async getRestaurantsByCategoryTagId(categoryTagId, query = {}) {
    const { page, limit, offset, order } = buildPagination(query);

    const totalItems = await Restaurant.count({
      distinct: true,
      include: [
        {
          model: MenuCategory,
          required: true,
          include: [
            {
              model: CategoryTag,
              where: { id: categoryTagId },
              required: true,
              through: { attributes: [] },
            },
          ],
        },
      ],
      where: { status: { [Op.in]: ["active"] } },
    });

    const rows = await Restaurant.findAll({
      where: { status: { [Op.in]: ["active"] } },
      offset,
      limit,
      order,
      attributes: ["id", "restaurant_name"],
      include: [
        {
          model: Branch,
          required: false,
          where: { main_branch: true },
          attributes: ["id", "name"],
          include: [
            {
              model: Location,
              attributes: ["address", "latitude", "longitude"],
            },
          ],
        },
        {
          model: SystemSetting,
          attributes: ["logo_url", "images"],
          required: false,
        },
        {
          model: MenuCategory,
          required: true,
          attributes: ["id", "name"],
          include: [
            {
              model: CategoryTag,
              where: { id: categoryTagId },
              attributes: ["id", "name"],
              required: true,
              through: { attributes: [] },
            },
          ],
        },
      ],
    });

    const restaurants = await Promise.all(
      rows.map(async (r) => {
        const plain = r.get({ plain: true });
        plain.MenuCategories = plain.MenuCategories?.map((cat) => ({
          id: cat.id,
          name: cat.name,
        }));

        plain.location =
          (plain.Branches && plain.Branches[0]?.Location) || null;
        delete plain.Branches;

        const { rating, total_reviews } =
          await ReviewService.calculateRestaurantRating(plain.id);
        plain.rating = rating;
        plain.total_reviews = total_reviews;

        return plain;
      })
    );

    const totalPages = Math.ceil(totalItems / limit);

    return {
      restaurants,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        pageSize: limit,
      },
    };
  },
};

module.exports = MenuCategoryService;
