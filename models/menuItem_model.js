"use strict";
module.exports = (sequelize, DataTypes) => {
  const MenuItem = sequelize.define(
    "MenuItem",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      menu_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "menus",
          key: "id",
        },
      },
      menu_category_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "menu_categories",
          key: "id",
        },
      },
      name: DataTypes.STRING(255),
      description: DataTypes.TEXT,
      unit_price: DataTypes.DECIMAL(10, 2),
      image_url: DataTypes.TEXT,
      seasonal: DataTypes.BOOLEAN,
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
  };

  return MenuItem;
};
