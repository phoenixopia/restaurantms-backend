"use strict";

module.exports = (sequelize, DataTypes) => {
  const CategoryTag = sequelize.define(
    "CategoryTag",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
    },
    {
      tableName: "category_tags",
      timestamps: false,
      underscored: true,
    }
  );
  CategoryTag.associate = (models) => {
    CategoryTag.belongsToMany(models.MenuCategory, {
      through: "MenuCategoryTags",
      foreignKey: "category_tag_id",
      otherKey: "menu_category_id",
    });
  };

  return CategoryTag;
};
