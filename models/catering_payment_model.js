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
      catering_quote_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "catering_quotes",
          key: "id",
        },
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      payment_method: {
        type: DataTypes.STRING(20),
      },
      payment_status: {
        type: DataTypes.ENUM("pending", "completed", "cancelled", "failed"),
        defaultValue: "pending",
      },
      transaction_id: {
        type: DataTypes.STRING,
      },
    },
    {
      tableName: "catering_payments",
      timestamps: true,
      underscored: true,
    }
  );

  CateringPayment.associate = (models) => {
    CateringPayment.belongsTo(models.CateringQuote, {
      foreignKey: "catering_quote_id",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return CateringPayment;
};
