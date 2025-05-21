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
    Menu.belongsToMany(models.Restaurant, {
      through: "RestaurantMenu",
      foreignKey: "menu_id",
      otherKey: "restaurant_id",
    });
    Menu.hasMany(models.MenuCategory, { foreignKey: "menu_id" });
    Menu.hasMany(models.MenuItem, { foreignKey: "menu_id" });
  };

  return Menu;
};
