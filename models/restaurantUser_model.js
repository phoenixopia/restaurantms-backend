"use strict";

const { getGeneratedId } = require('../utils/idGenerator');

module.exports = (sequelize, DataTypes) => {
  const RestaurantUser = sequelize.define(
    "RestaurantUser",
    {
      id: {
        type: DataTypes.STRING,
        defaultValue: getGeneratedId,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.STRING,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
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
    },
    {
      tableName: "restaurant_users",
      underscored: true,
      timestamps: true,
    }
  );
  // RestaurantUser.associate = (models) => {
  //   RestaurantUser.belongsTo(models.User, { foreignKey: "user_id" });
  //   RestaurantUser.belongsTo(models.Restaurant, {
  //     foreignKey: "restaurant_id",
  //   });
  // };

  return RestaurantUser;
};
