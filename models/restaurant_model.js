"use strict";

const plan = require("./plan_model");

module.exports = (sequelize, DataTypes) => {
  const Restaurant = sequelize.define(
    "Restaurant",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      restaurant_name: DataTypes.STRING(255),
      logo_url: DataTypes.TEXT,
      primary_color: DataTypes.STRING(7),
      language: DataTypes.STRING(10),
      rtl_enabled: DataTypes.BOOLEAN,
      status: {
        type: DataTypes.ENUM("active", "trial", "cancelled", "expired"),
        defaultValue: "trial",
      },
    },
    {
      tableName: "restaurants",
      timestamps: true,
      underscored: true,
    }
  );

  Restaurant.associate = (models) => {
    Restaurant.hasOne(models.Subscription, { foreignKey: "restaurant_id" });

    Restaurant.belongsToMany(models.User, {
      through: "RestaurantUser",
      foreignKey: "restaurant_id",
      otherKey: "user_id",
    });
    Restaurant.hasMany(models.Branch, {
      foreignKey: "restaurant_id",
    });

    // One Tenant can have multiple Locations
    Restaurant.hasMany(models.Location, { foreignKey: "restaurant_id" });

    Restaurant.belongsToMany(models.Menu, {
      through: "RestaurantMenu",
      foreignKey: "restaurant_id",
      otherKey: "menu_id",
    });

    Restaurant.hasMany(models.Reservation, { foreignKey: "restaurant_id" });
    Restaurant.hasMany(models.Feedback, { foreignKey: "restaurant_id" });
    Restaurant.hasMany(models.SupportTicket, { foreignKey: "restaurant_id" });
    Restaurant.hasOne(models.SystemSetting, { foreignKey: "restaurant_id" });
    Restaurant.hasMany(models.AnalyticsSnapshot, {
      foreignKey: "restaurant_id",
    });
  };

  return Restaurant;
};
