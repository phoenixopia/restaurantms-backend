"use strict";

module.exports = (sequelize, DataTypes) => {
  const MenuItemRecipe = sequelize.define(
    "MenuItemRecipe",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      menu_item_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "menu_items",
          key: "id",
        },
      },
      recipe_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "recipes",
          key: "id",
        },
      },
      quantity: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
    },
    {
      tableName: "menu_item_recipes",
      timestamps: true,
      underscored: true,
    }
  );

  return MenuItemRecipe;
};
