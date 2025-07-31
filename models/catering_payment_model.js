"use strict";

module.exports = (sequelize, DataTypes) => {
  const CateringPayment = sequelize.define(
    "CateringPayment",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      catering_request_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "catering_requests",
          key: "id",
        },
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      payment_method: {
        type: DataTypes.STRING,
      },
      payment_status: {
        type: DataTypes.ENUM("pending", "paid", "failed"),
        defaultValue: "pending",
      },
      transaction_id: {
        type: DataTypes.STRING,
      },
      paid_at: {
        type: DataTypes.DATE,
      },
    },
    {
      tableName: "catering_payments",
      timestamps: true,
      underscored: true,
    }
  );

  CateringPayment.associate = (models) => {
    CateringPayment.belongsTo(models.CateringRequest, {
      foreignKey: "catering_request_id",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return CateringPayment;
};
