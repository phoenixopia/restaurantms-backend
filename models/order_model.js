"use strict";
module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define(
    "Order",
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
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      table_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "tables",
          key: "id",
        },
      },
      order_date: DataTypes.DATE,
      type: DataTypes.ENUM("dine-in", "takeaway", "delivery"),
      status: DataTypes.ENUM("Pending", "InProgress", "Completed", "Cancelled"),
      total_amount: DataTypes.DECIMAL(10, 2),
      payment_status: DataTypes.ENUM("Paid", "Unpaid"),
    },
    {
      tableName: "orders",
      timestamps: true,
      underscored: true,
    }
  );

  Order.associate = (models) => {
    Order.belongsTo(models.Restaurant, { foreignKey: "restaurant_id" });
    Order.belongsTo(models.User, { foreignKey: "user_id" });
    Order.belongsTo(models.Table, { foreignKey: "table_id" });
    Order.belongsToMany(models.OrderItem, {
      through: "OrderItemOrder",
      foreignKey: "order_id",
      otherKey: "order_item_id",
    });
    Order.hasOne(models.Payment, { foreignKey: "order_id" });
    Order.hasOne(models.KdsOrder, { foreignKey: "order_id" });
    Order.hasOne(models.Feedback, { foreignKey: "order_id" });
  };

  return Order;
};
