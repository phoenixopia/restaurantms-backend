"use strict";

const sequelizePaginate = require("sequelize-paginate");

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
    Menu.belongsTo(models.Restaurant, {
      foreignKey: "restaurant_id",
    });
    Menu.hasMany(models.MenuCategory, { foreignKey: "menu_id" });
    // Menu.hasMany(models.MenuItem, { foreignKey: "menu_id" });
  };

  sequelizePaginate.paginate(Menu);

  return Menu;
};
