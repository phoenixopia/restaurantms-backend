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
      rtl_enabled: DataTypes.BOOLEAN, // ask tsebi its neccessity
      plan_id: {
        type: DataTypes.INTEGER,
        references: {
          model: "plans",
          key: "id",
        },
      },
      status: DataTypes.ENUM(
        "active",
        "trial",
        "suspended",
        "cancelled",
        "pending"
      ),
    },
    {
      tableName: "restaurants",
      timestamps: true,
      underscored: true,
    }
  );

  Restaurant.associate = (models) => {
    Restaurant.belongsTo(models.Plan, { foreignKey: "plan_id" });
    Restaurant.hasMany(models.User, { foreignKey: "restaurant_id" });
    Restaurant.hasMany(models.Subscription, { foreignKey: "restaurant_id" });
    Restaurant.hasMany(models.Menu, { foreignKey: "restaurant_id" });
    Restaurant.hasMany(models.Location, { foreignKey: "restaurant_id" });
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
