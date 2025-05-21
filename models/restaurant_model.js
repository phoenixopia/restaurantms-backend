"use strict";

const { getGeneratedId } = require("../utils/idGenerator");
const plan = require("./plan_model");

module.exports = (sequelize, DataTypes) => {
  const Restaurant = sequelize.define(
    "Restaurant",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },
      subscription_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "subscriptions",
          key: "id",
        },
      },
      // plan_id: {
      //   type: DataTypes.UUID,
      //   references: {
      //     model: "plans",
      //     key: "id",
      //   },
      // },
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
    // Restaurant.belongsTo(models.Plan, { foreignKey: "plan_id", onDelete: 'CASCADE', hooks: true });
    // Restaurant.hasMany(models.User, { foreignKey: "restaurant_id", onDelete: 'CASCADE', hooks: true });
    Restaurant.belongsToMany(models.User, { through: models.RestaurantUser, foreignKey: "restaurant_id", onDelete: 'CASCADE', hooks: true});
    Restaurant.belongsTo(models.Subscription, { foreignKey: "subscription_id", onDelete: 'CASCADE', hooks: true });
    Restaurant.hasMany(models.Menu, { foreignKey: "restaurant_id", onDelete: 'CASCADE', hooks: true });
    Restaurant.hasMany(models.Location, { foreignKey: "restaurant_id", onDelete: 'CASCADE', hooks: true });
    Restaurant.hasMany(models.Reservation, { foreignKey: "restaurant_id", onDelete: 'CASCADE', hooks: true });
    Restaurant.hasMany(models.Feedback, { foreignKey: "restaurant_id", onDelete: 'CASCADE', hooks: true });
    Restaurant.hasMany(models.SupportTicket, { foreignKey: "restaurant_id", onDelete: 'CASCADE', hooks: true });
    Restaurant.hasOne(models.SystemSetting, { foreignKey: "restaurant_id", onDelete: 'CASCADE', hooks: true });
    Restaurant.hasMany(models.AnalyticsSnapshot, { foreignKey: "restaurant_id", onDelete: 'CASCADE', hooks: true});
  };

  return Restaurant;
};
