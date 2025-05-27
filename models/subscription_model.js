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
      billing_cycle: {
        type: DataTypes.ENUM("monthly", "yearly"),
        allowNull: false,
      },
      start_date: DataTypes.DATEONLY,
      end_date: DataTypes.DATEONLY,
      billing_provider: DataTypes.ENUM(
        "stripe",
        "paypal",
        "telebirr",
        "cash",
        "CBE"
      ),
      status: DataTypes.ENUM("active", "cancelled", "expired"),
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
      hooks: true,
    });
    Subscription.belongsTo(models.Plan, {
      foreignKey: "plan_id",
      onDelete: "CASCADE",
      hooks: true,
    });
  };

  return Subscription;
};
