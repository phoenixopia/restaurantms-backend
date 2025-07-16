"use strict";

const { Menu, sequelize } = require("../../models");
const throwError = require("../../utils/throwError");

const MenuService = {
  async createMenu({ name, description, is_active = true }, restaurantId) {
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

      await t.commit();
      return menu;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async listMenu(user) {
    let restaurantId;
    let categoryWhere = {};

    if (user.role_name === "restaurant_admin") {
      restaurantId = user.restaurant_id;
    } else if (user.role_name === "staff") {
      const branch = await Branch.findByPk(user.branch_id);
      if (!branch) throwError("Assigned branch not found", 404);
      restaurantId = branch.restaurant_id;

      categoryWhere.branch_id = user.branch_id;
    } else {
      throwError("Unauthorized role for viewing menu", 403);
    }

    const menu = await Menu.findOne({
      where: { restaurant_id: restaurantId },
      include: [
        {
          model: MenuCategory,
          required: false,
          where: Object.keys(categoryWhere).length ? categoryWhere : undefined,
          attributes: { exclude: ["created_at", "updated_at"] },
          include: [
            {
              model: MenuItem,
              attributes: { exclude: ["created_at", "updated_at"] },
            },
          ],
        },
      ],
    });

    if (!menu) throwError("No menu found for this restaurant", 404);
    return menu;
  },

  async updateMenu(id, user, { name, description, is_active }) {
    const t = await sequelize.transaction();

    try {
      let restaurantId;

      if (user.role_name === "restaurant_admin") {
        restaurantId = user.restaurant_id;
      } else if (user.role_name === "staff") {
        const branch = await Branch.findByPk(user.branch_id, {
          transaction: t,
        });
        if (!branch) throwError("Branch not found", 404);
        restaurantId = branch.restaurant_id;
      } else {
        throwError("Unauthorized role for updating menu", 403);
      }

      const menu = await Menu.findOne({
        where: { id, restaurant_id: restaurantId },
        transaction: t,
      });

      if (!menu) throwError("Menu not found for this restaurant", 404);

      if (name !== undefined) menu.name = name;
      if (description !== undefined) menu.description = description;
      if (is_active !== undefined) menu.is_active = is_active;

      await menu.save({ transaction: t });
      await t.commit();

      return menu;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async deleteMenu(id, user) {
    const t = await sequelize.transaction();
    try {
      let restaurantId;

      if (user.role_name === "restaurant_admin") {
        restaurantId = user.restaurant_id;
      } else if (user.role_name === "staff") {
        const branch = await Branch.findByPk(user.branch_id, {
          transaction: t,
        });
        if (!branch) throwError("Branch not found", 404);
        restaurantId = branch.restaurant_id;
      } else {
        throwError("Unauthorized role for deleting menu", 403);
      }

      const menu = await Menu.findOne({
        where: { id, restaurant_id: restaurantId },
        transaction: t,
      });

      if (!menu) throwError("Menu not found for this restaurant", 404);

      await menu.destroy({ transaction: t });
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },
  async toggleMenuActivation(id, user) {
    const t = await sequelize.transaction();
    try {
      let restaurantId;

      if (user.role_name === "restaurant_admin") {
        restaurantId = user.restaurant_id;
      } else if (user.role_name === "staff") {
        const branch = await Branch.findByPk(user.branch_id, {
          transaction: t,
        });
        if (!branch) throwError("Branch not found", 404);
        restaurantId = branch.restaurant_id;
      } else {
        throwError("Unauthorized role for toggling menu activation", 403);
      }

      const menu = await Menu.findOne({
        where: { id, restaurant_id: restaurantId },
        transaction: t,
      });
      if (!menu) throwError("Menu not found for this restaurant", 404);

      menu.is_active = !menu.is_active;
      await menu.save({ transaction: t });
      await t.commit();

      return menu;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },
};

module.exports = MenuService;
