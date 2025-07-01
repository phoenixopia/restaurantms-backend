"use strict";
const { getGeneratedId } = require('../utils/idGenerator');

module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define(
    "Payment",
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
      amount: DataTypes.DECIMAL(10, 2),
      payment_method: DataTypes.ENUM("Stripe", "PayPal", "Telebirr", "CBE"),
      transaction_id: DataTypes.STRING(255),
      reference: DataTypes.STRING(255),
      payment_date: DataTypes.DATE,
      status: DataTypes.ENUM("Pending", "Completed", "Failed"),
    },
    {
      tableName: "payments",
      timestamps: true,
      underscored: true,
    }
  );

  Payment.associate = (models) => {
    Payment.belongsTo(models.Order, { foreignKey: "order_id", as: "order" });
  };

  return Payment;
};
