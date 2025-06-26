"use strict";
const sequelizePaginate = require("sequelize-paginate");

module.exports = (sequelize, DataTypes) => {
  const MenuCategory = sequelize.define(
    "MenuCategory",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      branch_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "branches",
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
      image: {
        type: DataTypes.STRING(500),
        allowNull: true,
        validate: {
          isUrl: {
            msg: "Image must be a valid URL",
          },
        },
      },
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
    MenuCategory.belongsTo(models.Menu, { foreignKey: "menu_id" });
    MenuCategory.belongsTo(models.Branch, { foreignKey: "branch_id" });
    MenuCategory.hasMany(models.MenuItem, { foreignKey: "menu_category_id" });
  };

  sequelizePaginate.paginate(MenuCategory);

  return MenuCategory;
};
