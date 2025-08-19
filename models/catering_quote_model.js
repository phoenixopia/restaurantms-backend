"use strict";

module.exports = (sequelize, DataTypes) => {
  const CateringQuote = sequelize.define(
    "CateringQuote",
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
      catering_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "caterings",
          key: "id",
        },
      },
      estimated_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      status: {
        type: DataTypes.ENUM("pending", "accepted", "negotiate", "rejected"),
        allowNull: false,
        defaultValue: "pending",
      },

      payment_status: {
        type: DataTypes.ENUM("Paid", "Unpaid"),
        defaultValue: "Unpaid",
      },
    },
    {
      tableName: "catering_quotes",
      timestamps: true,
      underscored: true,
    }
  );

  CateringQuote.associate = (models) => {
    CateringQuote.belongsTo(models.CateringRequest, {
      foreignKey: "catering_request_id",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    CateringQuote.belongsTo(models.Catering, {
      foreignKey: "catering_id",
    });
    CateringQuote.hasOne(models.CateringPayment, {
      foreignKey: "catering_quote_id",
    });
  };

  return CateringQuote;
};
