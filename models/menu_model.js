"use strict";
const { getGeneratedId } = require('../utils/idGenerator');

module.exports = (sequelize, DataTypes) => {
  const Menu = sequelize.define(
    "Menu",
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
      name: DataTypes.STRING(255),
      description: DataTypes.TEXT,
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      }
    },
    {
      tableName: "menus",
      timestamps: true,
      underscored: true,
    }
  );

  Menu.associate = (models) => {
    Menu.belongsTo(models.Restaurant, { foreignKey: "restaurant_id", as: "restaurant", onDelete: 'CASCADE'  });
    Menu.hasMany(models.MenuCategory, { foreignKey: "menu_id", as: "categories", onDelete: 'CASCADE' });
    Menu.hasMany(models.MenuItem, { foreignKey: "menu_id", as: "items", onDelete: 'CASCADE' });
  };

  return Menu;
};
