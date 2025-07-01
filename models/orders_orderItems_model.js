"use strict";

const { getGeneratedId } = require('../utils/idGenerator');

module.exports = (sequelize, DataTypes) => {
  const OrderItemOrder = sequelize.define(
    "OrdersOrderItems",
    {
      id: {
        type: DataTypes.STRING,
        defaultValue: getGeneratedId,
        primaryKey: true,
        allowNull: false,
      },
      order_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "orders",
          key: "id",
        },
      },
      order_item_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "order_items",
          key: "id",
        },
      },
    },
    {
      tableName: "orders_order_items",
      timestamps: true,
      underscored: true,
    }
  );

  return OrderItemOrder;
};
