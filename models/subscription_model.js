"use strict";
module.exports = (sequelize, DataTypes) => {
  const Subscription = sequelize.define(
    "Subscription",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      restaurant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "restaurants",
          key: "id",
        },
      },

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

      payment_method: DataTypes.ENUM("card", "walet", "cash", "bank_transfer"),

      status: DataTypes.ENUM(
        "active",
        "pending",
        "inactive",
        "cancelled",
        "expired"
      ),

      receipt: {
        type: DataTypes.STRING(2083),
        allowNull: true,
      },
    },
    {
      tableName: "subscriptions",
      timestamps: true,
      underscored: true,
    }
  );

  Subscription.associate = (models) => {
    Subscription.belongsTo(models.Restaurant, {
      foreignKey: "restaurant_id",
      onDelete: "CASCADE",
    });
    Subscription.belongsTo(models.Plan, {
      foreignKey: "plan_id",
      onDelete: "CASCADE",
    });
    Subscription.belongsTo(models.User, {
      foreignKey: "user_id",
    });
  };

  return Subscription;
};
