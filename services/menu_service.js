"use strict";

const { Menu, sequelize } = require("../models");
const throwError = require("../utils/throwError");

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

  async listMenu(restaurantId) {
    const menu = await Menu.findOne({ where: { restaurant_id: restaurantId } });
    if (!menu) throwError("No menu found for this restaurant", 404);
    return menu;
  },

  async updateMenu(id, restaurantId, { name, description, is_active }) {
    const t = await sequelize.transaction();
    try {
      const menu = await Menu.findOne({
        where: { id, restaurant_id: restaurantId },
        transaction: t,
      });
      if (!menu) throwError("Menu not found", 404);

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

  async deleteMenu(id, restaurantId) {
    const t = await sequelize.transaction();
    try {
      const menu = await Menu.findOne({
        where: { id, restaurant_id: restaurantId },
        transaction: t,
      });

      if (!menu) throwError("Menu not found", 404);

      await menu.destroy({ transaction: t });
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async toggleMenuActivation(id, restaurantId) {
    const t = await sequelize.transaction();
    try {
      const menu = await Menu.findOne({
        where: { id, restaurant_id: restaurantId },
        transaction: t,
      });
      if (!menu) throwError("Menu not found", 404);

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
