"use strict";

const { getGeneratedId } = require("../utils/idGenerator");

module.exports = (sequelize, DataTypes) => {
  const Restaurant = sequelize.define(
    "Restaurant",
    {
      id: {
        type: DataTypes.STRING,
        defaultValue: getGeneratedId,
        primaryKey: true,
        allowNull: false,
      },
      subscription_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "subscriptions",
          key: "id",
        },
      },
      name: {
        type: DataTypes.STRING(255),
        validate: {
          notEmpty: true,
        },
      },
      logo_url: DataTypes.TEXT,
      primary_color: DataTypes.STRING(7),
      language: DataTypes.STRING(10),
      rtl_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      }, // ask tsebi its neccessity
      status: {
        type: DataTypes.ENUM(
          "active",
          "trial",
          "suspended",
          "cancelled",
          "pending"
        ),
        defaultValue: "pending",
      },
    },
    {
      tableName: "restaurants",
      timestamps: true,
      underscored: true,
    }
  );

  Restaurant.associate = (models) => {
    // Restaurant.belongsTo(models.Plan, { foreignKey: "plan_id", });
    // Restaurant.hasMany(models.User, { foreignKey: "restaurant_id", onDelete: 'CASCADE', hooks: true });
    Restaurant.belongsToMany(models.User, { through: models.RestaurantUser, foreignKey: "restaurant_id", onDelete: 'CASCADE', hooks: true, as: "users" });
    Restaurant.belongsTo(models.Subscription, { foreignKey: "subscription_id", as: "subscription" });
    Restaurant.hasMany(models.Menu, { foreignKey: "restaurant_id", onDelete: 'CASCADE', hooks: true, as: "menus" });
    Restaurant.hasMany(models.MenuCategory, { foreignKey: "restaurant_id", onDelete: 'CASCADE', hooks: true, as: "menusCategories" });
    Restaurant.hasMany(models.MenuItem, { foreignKey: "restaurant_id", onDelete: 'CASCADE', hooks: true, as: "menusItems" });
    Restaurant.hasMany(models.Location, { foreignKey: "restaurant_id", onDelete: 'CASCADE', hooks: true, as: "locations" });
    Restaurant.hasMany(models.Reservation, { foreignKey: "restaurant_id", onDelete: 'CASCADE', hooks: true, as: "reservations" });
    Restaurant.hasMany(models.Feedback, { foreignKey: "restaurant_id", onDelete: 'CASCADE', hooks: true, as: "feedbacks" });
    Restaurant.hasMany(models.SupportTicket, { foreignKey: "restaurant_id", onDelete: 'CASCADE', hooks: true, as: "supportTickets" });
    Restaurant.hasOne(models.SystemSetting, { foreignKey: "restaurant_id", onDelete: 'CASCADE', hooks: true, as: "systemSetting" });
    Restaurant.hasMany(models.AnalyticsSnapshot, { foreignKey: "restaurant_id", onDelete: 'CASCADE', hooks: true, as: "analyticsSnapshots" });
  };

  return Restaurant;
};
