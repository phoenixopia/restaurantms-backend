"use strict";
const { getGeneratedId } = require('../utils/idGenerator');

module.exports = (sequelize, DataTypes) => {
  const MenuCategory = sequelize.define(
    "MenuCategory",
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
          key: "id",
        },
        onDelete: 'CASCADE'
      },
      menu_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "menus",
          key: "id",
        },
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      sort_order: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
    },
    {
      tableName: "menu_categories",
      timestamps: true,
      underscored: true,
    }
  );

  MenuCategory.associate = (models) => {
    MenuCategory.belongsTo(models.Menu, { foreignKey: "menu_id", as: "menu" });
    MenuCategory.belongsTo(models.Restaurant, { foreignKey: "restaurant_id", as: "restaurant" });
    MenuCategory.hasMany(models.MenuItem, { foreignKey: "menu_category_id", as: "menuItems" });
  };

  return MenuCategory;
};
