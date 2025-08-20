"use strict";

module.exports = (sequelize, DataTypes) => {
  const LoyaltyPoint = sequelize.define(
    "LoyaltyPoint",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
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
      customer_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "customers",
          key: "id",
        },
      },
      points_balance: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      points_earned: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      points_redeemed: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      last_activity_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      expiry_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "loyalty_points",
      timestamps: true,
      underscored: true,
    }
  );

  LoyaltyPoint.associate = (models) => {
    LoyaltyPoint.belongsTo(models.Customer, {
      foreignKey: "customer_id",
    });
    LoyaltyPoint.belongsTo(models.Restaurant, {
      foreignKey: "tenant_id",
    });
  };

  return LoyaltyPoint;
};
