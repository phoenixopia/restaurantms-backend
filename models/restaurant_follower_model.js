"use strict";

module.exports = (sequelize, DataTypes) => {
  const RestaurantFollower = sequelize.define(
    "RestaurantFollower",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      customer_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "customers",
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
      tableName: "restaurant_followers",
      timestamps: true,
      underscored: true,
    }
  );

  RestaurantFollower.associate = (models) => {
    RestaurantFollower.belongsTo(models.Customer, {
      foreignKey: "customer_id",
      onDelete: "CASCADE",
    });

    RestaurantFollower.belongsTo(models.Restaurant, {
      foreignKey: "restaurant_id",
      onDelete: "CASCADE",
    });
  };

  return RestaurantFollower;
};
