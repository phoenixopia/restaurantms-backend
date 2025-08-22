"use strict";
const { Menu, Restaurant, User, Role } = require("../models");
const { v4: uuidv4 } = require("uuid");

module.exports = async () => {
  const now = new Date();

  const restaurantAdminRole = await Role.findOne({ where: { name: "restaurant_admin" } });
  const admins = await User.findAll({ where: { role_id: restaurantAdminRole.id } });
  const restaurants = await Restaurant.findAll();

  for (const restaurant of restaurants) {
    const admin = admins.find(a => a.restaurant_id === restaurant.id);
    if (!admin) continue;

    await Menu.create({
      id: uuidv4(),
      restaurant_id: restaurant.id,
      name: `${restaurant.restaurant_name} Main Menu`,
      description: `The main menu for ${restaurant.restaurant_name}`,
      is_active: true,
      created_by: admin.id,
      updated_by: admin.id,
      created_at: now,
      updated_at: now,
    });
  }
};
