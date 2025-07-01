"use strict";

const { getGeneratedId } = require("../utils/idGenerator");

module.exports = (sequelize, DataTypes) => {
  const Review = sequelize.define(
    "Review",
      {
        id: {
            type: DataTypes.STRING,
            defaultValue: getGeneratedId,
            primaryKey: true,
            allowNull: false,
        },
        customer_id: {
            type: DataTypes.STRING,
            allowNull: false,
            references: {
              model: "users",
              key: "id",
            },
        },
        menu_item_id: {
            type: DataTypes.STRING,
            allowNull: false,
            references: {
              model: "menu_items",
              key: "id",
            },
        },
        detail: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        rate: {
            type: DataTypes.ENUM('1', '2', '3', '4', '5'),
            allowNull: false,
            defaultValue: '1',
        },
    },
    {
      tableName: "reviews",
      timestamps: true,
      underscored: true,
    }
  );

  Review.associate = (models) => {
    Review.belongsTo(models.User, { foreignKey: "customer_id", as: "customer" });
    Review.belongsTo(models.MenuItem, { foreignKey: "menu_item_id", as: "item" });
  };

  return Review;
};
