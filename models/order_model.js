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
    Order.belongsTo(models.Restaurant, { foreignKey: "restaurant_id", as: "restaurant" });
    Order.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
    Order.belongsTo(models.Table, { foreignKey: "table_id", as: "table" });
    Order.hasMany(models.OrderItem, { foreignKey: "order_id", as: "orderItems" });
    Order.hasOne(models.Payment, { foreignKey: "order_id", as: "payment" });
    Order.hasOne(models.KdsOrder, { foreignKey: "order_id", as: "kdsOrder" });
    Order.hasOne(models.Feedback, { foreignKey: "order_id", as: "feedback" });
  };

  return Order;
};
