"use strict";

module.exports = (sequelize, DataTypes) => {
  const CateringRequest = sequelize.define(
    "CateringRequest",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      catering_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "caterings",
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
      event_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      guest_count: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      delivery_location: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      event_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("pending", "approved", "rejected"),
        defaultValue: "pending",
        allowNull: false,
      },
    },
    {
      tableName: "catering_requests",
      timestamps: true,
      underscored: true,
    }
  );

  CateringRequest.associate = (models) => {
    CateringRequest.belongsTo(models.Catering, {
      foreignKey: "catering_id",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    CateringRequest.belongsTo(models.Customer, {
      foreignKey: "customer_id",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    CateringRequest.hasOne(models.CateringQuote, {
      foreignKey: "catering_request_id",
    });

    CateringRequest.hasOne(models.CateringPayment, {
      foreignKey: "catering_request_id",
    });
  };

  return CateringRequest;
};
