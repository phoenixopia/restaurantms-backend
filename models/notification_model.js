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
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
      },
      customer_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "customers",
          key: "id",
        },
      },
      channel: {
        type: DataTypes.ENUM("Email", "SMS", "In-App"),
        allowNull: false,
      },

      title: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      body: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("Pending", "Sent", "Failed"),
        allowNull: false,
        defaultValue: "Pending",
      },
      retry_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      sent_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      failed_at: {
        type: DataTypes.DATE,
        allowNull: true,
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
    Notification.belongsTo(models.User, { foreignKey: "user_id" });
    Notification.belongsTo(models.Customer, { foreignKey: "customer_id" });
  };

  return Notification;
};
