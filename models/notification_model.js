"use strict";

module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define(
    "Notification",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "users",
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
      channel: {
        type: DataTypes.ENUM("Email", "SMS", "In-App"),
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("Pending", "Sent", "Failed"),
        allowNull: false,
        defaultValue: "Pending",
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "notifications",
      timestamps: false,
      underscored: true,
    }
  );

  Notification.associate = (models) => {
    Notification.belongsTo(models.User, {
      foreignKey: "user_id",
    });
    Notification.belongsTo(models.Customer, {
      foreignKey: "customer_id",
    });
  };

  return Notification;
};
