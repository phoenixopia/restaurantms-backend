"use strict";

const { getGeneratedId } = require("../utils/idGenerator");

module.exports = (sequelize, DataTypes) => {
  const Subscription = sequelize.define(
    "Subscription",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },
      // restaurant_id: {
      //   type: DataTypes.UUID,
      //   allowNull: false,
      //   references: {
      //     model: "restaurants",
      //     key: "id",
      //   },
      // },
      plan_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "plans",
          key: "id",
        },
      },
      start_date: DataTypes.DATEONLY,
      end_date: DataTypes.DATEONLY,
      billing_provider: DataTypes.ENUM("stripe", "paypal", "telebirr", "cash", "cbe"),
      status: DataTypes.ENUM("active", "cancelled", "expired"),
    },
    {
      tableName: "subscriptions",
      timestamps: true,
      underscored: true,
    }
  );

  Subscription.associate = (models) => {
    Subscription.hasMany(models.Restaurant, { foreignKey: "subscription_id" });
    Subscription.belongsTo(models.Plan, { foreignKey: "plan_id" });
  };

  return Subscription;
};
