"use strict";

const { getGeneratedId } = require('../utils/idGenerator');

module.exports = (sequelize, DataTypes) => {
  const RestaurantMenu = sequelize.define(
    "RestaurantMenu",
    {
      id: {
        type: DataTypes.STRING,
        defaultValue: getGeneratedId,
        primaryKey: true,
        allowNull: false,
      },
      restaurant_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "restaurants",
        },
      },
      menu_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "menus",
          key: "id",
        },
      },
    },
    {
      tableName: "restaurant_menus",
      timestamps: true,
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  RestaurantMenu.associate = (models) => {
    RestaurantMenu.belongsTo(models.Restaurant, {
      foreignKey: "tenant_id",
      as: "restaurant",
    });
    RestaurantMenu.belongsTo(models.Menu, {
      foreignKey: "menu_id",
      as: "menu",
    });
  };

  return RestaurantMenu;
};
