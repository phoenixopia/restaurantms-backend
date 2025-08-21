"use strict";

module.exports = (sequelize, DataTypes) => {
  const Recipe = sequelize.define(
    "Recipe",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      unit: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "recipes",
      timestamps: true,
      underscored: true,
    }
  );

  Recipe.associate = (models) => {
    Recipe.belongsToMany(models.MenuItem, {
      through: models.MenuItemRecipe,
      foreignKey: "recipe_id",
      otherKey: "menu_item_id",
    });
  };

  return Recipe;
};
