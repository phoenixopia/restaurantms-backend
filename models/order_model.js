"use strict";

module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define(
    "Order",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      restaurant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "restaurants",
          key: "id",
        },
      },
      branch_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "branches",
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
      table_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "tables",
          key: "id",
        },
      },
      order_date: {
        type: DataTypes.DATE,
        defaultValue: Date.now(),
      },
      type: {
        type: DataTypes.ENUM("dine-in", "takeaway", "delivery"),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("Pending", "InProgress", "Completed", "Cancelled"),
        defaultValue: "Pending",
      },
      total_amount: {
        type: DataTypes.DECIMAL(10, 2),
      },
      payment_status: {
        type: DataTypes.ENUM("Paid", "Unpaid"),
        defaultValue: "Unpaid",
      },
    },
    {
      tableName: "orders",
      timestamps: true,
      underscored: true,
    }
  );

  Order.associate = (models) => {
    Order.belongsTo(models.Restaurant, {
      foreignKey: "restaurant_id",
    });

    Order.belongsTo(models.Branch, { foreignKey: "branch_id" });

    Order.belongsTo(models.Customer, { foreignKey: "customer_id" });

    Order.belongsTo(models.Table, { foreignKey: "table_id" });
    Order.hasMany(models.OrderItem, {
      foreignKey: "order_id",
    });
    Order.hasOne(models.KdsOrder, {
      foreignKey: "order_id",
    });
    Order.hasOne(models.Review, {
      foreignKey: "order_id",
    });
  };

  return Order;
};
