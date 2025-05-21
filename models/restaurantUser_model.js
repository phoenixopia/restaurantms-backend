"use strict";

const { getGeneratedId } = require("../utils/idGenerator");

module.exports = (sequelize, DataTypes) => {
  const RestaurantUser = sequelize.define(
    "RestaurantUser",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      restaurant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "restaurants",
          key: "id",
        },
      },
    },
    {
      tableName: "restaurant_user",
      timestamps: true,
      underscored: true,
    }
  );

  return RestaurantUser;
};
