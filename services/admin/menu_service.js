"use strict";

const { where, Op } = require("sequelize");
const {
  Restaurant,
  Branch,
  Menu,
  MenuCategory,
  MenuItem,
  sequelize,
} = require("../../models");
const throwError = require("../../utils/throwError");
const logActivity = require("../../utils/logActivity");

async function getRestaurantIdFromUser(user, transaction = null) {
  if (user.restaurant_id) {
    return user.restaurant_id;
  }
  if (user.branch_id) {
    const branch = await Branch.findByPk(user.branch_id, { transaction });
    if (!branch) throwError("Branch not found", 404);
    return branch.restaurant_id;
  }
  throwError("User does not belong to a restaurant or branch", 403);
}

const MenuService = {
  async createMenu(
    { name, description, is_active = true },
    restaurantId,
    user
  ) {
    const t = await sequelize.transaction();
    try {
      if (!name) throwError("Menu name is required", 400);

      const existing = await Menu.findOne({
        where: { restaurant_id: restaurantId },
        transaction: t,
      });
      if (existing)
        throwError("A menu already exists for this restaurant", 400);

      const menu = await Menu.create(
        {
          name,
          description,
          is_active,
          restaurant_id: restaurantId,
        },
        { transaction: t }
      );

      await logActivity({
        user_id: user.id,
        module: "Menu",
        action: "Create",
        details: menu.toJSON(),
        transaction: t,
      });

      await t.commit();
      return menu;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  // async listMenu(user) {
  //   const restaurantId = await getRestaurantIdFromUser(user);

  //   const restaurant = await Restaurant.findByPk(restaurantId);

  //   if (!restaurant) throwError("Restaurant not found", 404);

  //   const menu = await Menu.findOne({
  //     where: { restaurant_id: restaurant.id },
  //   });
  //   if (!menu) throwError("Menu not found ", 404);

  //   let categoryWhere = { menu_id: menu.id };
  //   if (user.branch_id && !user.restaurant_id) {
  //     categoryWhere.branch_id = user.branch_id;
  //   }

  //   const totalCategories = await MenuCategory.count({ where: categoryWhere });

  //   const categories = await MenuCategory.findAll({
  //     where: categoryWhere,
  //     attributes: ["id"],
  //   });
  //   const categoryIds = categories.map((c) => c.id);

  //   const totalItems = categoryIds.length
  //     ? await MenuItem.count({
  //         where: { menu_category_id: { [Op.in]: categoryIds } },
  //       })
  //     : 0;

  //   return {
  //     id: menu.id,
  //     name: menu.name,
  //     total_categories: totalCategories,
  //     total_items: totalItems,
  //   };
  // },

  async listMenu(user) {
  const restaurantId = await getRestaurantIdFromUser(user);

  const restaurant = await Restaurant.findByPk(restaurantId);
  if (!restaurant) throwError("Restaurant not found", 404);

  const menu = await Menu.findOne({
    where: { restaurant_id: restaurant.id },
  });

  if (!menu) {
    return {
      id: null,
      name: null,
      total_categories: 0,
      total_items: 0,
    };
  }

  let categoryWhere = { menu_id: menu.id };
  if (user.branch_id && !user.restaurant_id) {
    categoryWhere.branch_id = user.branch_id;
  }

  const totalCategories = await MenuCategory.count({ where: categoryWhere });

  const categories = await MenuCategory.findAll({
    where: categoryWhere,
    attributes: ["id"],
  });
  const categoryIds = categories.map((c) => c.id);

  const totalItems = categoryIds.length
    ? await MenuItem.count({
        where: { menu_category_id: { [Op.in]: categoryIds } },
      })
    : 0;

  return {
    id: menu.id,
    name: menu.name,
    total_categories: totalCategories,
    total_items: totalItems,
  };
},

  async updateMenu(user, data) {
    return await sequelize.transaction(async (t) => {
      const restaurantId = await getRestaurantIdFromUser(user, t);

      const restaurant = await Restaurant.findByPk(restaurantId, {
        transaction: t,
      });
      if (!restaurant) throwError("Restaurant not found", 404);

      const menu = await Menu.findOne({
        where: { restaurant_id: restaurant.id },
        transaction: t,
      });
      if (!menu) throwError("Menu not found", 404);

      const oldMenu = menu;

      menu.name = data.name ?? menu.name;
      menu.description = data.description ?? menu.description;

      await logActivity({
        user_id: user.id,
        module: "Menu",
        action: "Update",
        details: { before: oldMenu.toJSON(), after: menu.toJSON() },
        transaction: t,
      });

      await menu.save({ transaction: t });

      return menu;
    });
  },

  async deleteMenu(user) {
    return await sequelize.transaction(async (t) => {
      const restaurantId = await getRestaurantIdFromUser(user, t);

      const restaurant = await Restaurant.findByPk(restaurantId, {
        transaction: t,
      });
      if (!restaurant) throwError("Restaurant not found", 404);

      const menu = await Menu.findOne({
        where: { restaurant_id: restaurant.id },
        transaction: t,
      });
      if (!menu) throwError("Menu not found", 404);

      const deletedMenu = menu;
      await logActivity({
        user_id: user.id,
        module: "Menu",
        action: "Delete",
        details: deletedMenu.toJSON(),
        transaction: t,
      });

      await menu.destroy({ transaction: t });
    });
  },
};

module.exports = MenuService;
