"use strict";

module.exports = (sequelize, DataTypes) => {
  const MenuCategoryTags = sequelize.define(
    "MenuCategoryTags",
    {
      menu_category_id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        references: {
          model: "menu_categories",
          key: "id",
        },

        // part of composite primary key
      },
      category_tag_id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        references: {
          model: "category_tags",
          key: "id",
        },

        // part of composite primary key
      },
    },
    {
      tableName: "menu_category_tags",
      timestamps: false,
      underscored: true,
    }
  );

  return MenuCategoryTags;
};
