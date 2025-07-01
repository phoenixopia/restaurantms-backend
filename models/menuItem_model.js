"use strict";
const { getGeneratedId } = require('../utils/idGenerator');

module.exports = (sequelize, DataTypes) => {
  const MenuItem = sequelize.define(
    "MenuItem",
    {
      id: {
        type: DataTypes.STRING,
        defaultValue: getGeneratedId,
        primaryKey: true,
        allowNull: false,
      },
      menu_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "menus",
          key: "id",
        },
      },
      menu_category_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "menu_categories",
          key: "id",
        },
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
      name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      unit_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      image_url: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      seasonal: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
    },
    {
      tableName: "menu_items",
      timestamps: true,
      underscored: true,
    }
  );

  MenuItem.associate = (models) => {
    MenuItem.belongsTo(models.Menu, { foreignKey: "menu_id", as: "menu" });
    MenuItem.belongsTo(models.MenuCategory, { foreignKey: "menu_category_id", as: "category" });
    MenuItem.hasMany(models.OrderItem, { foreignKey: "menu_item_id", as: "orderItems" });
    MenuItem.hasMany(models.AnalyticsSnapshot, { foreignKey: "top_item_id", as: "analyticsSnapshots" });
    MenuItem.hasMany(models.Review, { foreignKey: "menu_item_id", as: "reviews" });
    MenuItem.belongsTo(models.Restaurant, { foreignKey: "restaurant_id", as: "restaurant" });
  };

  return MenuItem;
};
