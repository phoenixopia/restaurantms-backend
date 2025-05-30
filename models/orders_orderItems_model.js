"use strict";

module.exports = (sequelize, DataTypes) => {
  const OrderItemOrder = sequelize.define(
    "OrdersOrderItems",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      order_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "orders",
          key: "id",
        },
      },
      order_item_id: {
        type: DataTypes.UUID,
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
