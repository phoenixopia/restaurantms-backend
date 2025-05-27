"use strict";
module.exports = (sequelize, DataTypes) => {
  const MenuCategory = sequelize.define(
    "MenuCategory",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      restaurant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "restaurants",
          key: "id",
        },
      },
      menu_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "menus",
          key: "id",
        },
      },
      name: DataTypes.STRING(255),
      description: DataTypes.TEXT,
      sort_order: DataTypes.INTEGER,
      is_active: DataTypes.BOOLEAN,
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
