"use strict";
module.exports = (sequelize, DataTypes) => {
  const Menu = sequelize.define(
    "Menu",
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
      name: DataTypes.STRING(255),
      description: DataTypes.TEXT,
      is_active: DataTypes.BOOLEAN,
    },
    {
      tableName: "menus",
      timestamps: true,
      underscored: true,
    }
  );

  Menu.associate = (models) => {
    Menu.belongsTo(models.Restaurant, { foreignKey: "restaurant_id", as: "restaurant" });
    Menu.hasMany(models.MenuCategory, { foreignKey: "menu_id", as: "categories" });
    Menu.hasMany(models.MenuItem, { foreignKey: "menu_id", as: "items" });
  };

  return Menu;
};
