"use strict";
const { getGeneratedId } = require('../utils/idGenerator');

module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define(
    "Order",
    {
      id: {
        type: DataTypes.STRING,
        defaultValue: getGeneratedId,
        primaryKey: true,
        allowNull: false,
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
      user_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      table_id: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
          model: "tables",
          key: "id",
        },
      },
      date: {
        type: DataTypes.DATE,
        defaultValue: Date.now()
      },
      type: {
        type: DataTypes.ENUM("dine-in", "takeaway", "delivery"),
        defaultValue: "dine-in"
      },
      status: {
        type: DataTypes.ENUM("pending", "in_progress", "completed", "cancelled"),
        defaultValue: 'pending'
      },
      total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
      },
      payment_status: {
        type: DataTypes.ENUM("paid", "un_paid"),
        defaultValue: 'un_paid'
      }
    },
    {
      tableName: "orders",
      timestamps: true,
      underscored: true,
    }
  );

  Order.associate = (models) => {
    Order.belongsTo(models.Restaurant, { foreignKey: "restaurant_id", as: "restaurant", onDelete: 'CASCADE' });
    Order.belongsTo(models.User, { foreignKey: "user_id", as: "user", });
    Order.belongsTo(models.Table, { foreignKey: "table_id", as: "table" });
    Order.hasMany(models.OrderItem, { foreignKey: "order_id", as: "orderItems" });
    Order.hasOne(models.Payment, { foreignKey: "order_id", as: "payment" });
    Order.hasOne(models.KdsOrder, { foreignKey: "order_id", as: "kdsOrder" });
    Order.hasOne(models.Feedback, { foreignKey: "order_id", as: "feedback" });
  };

  return Order;
};
