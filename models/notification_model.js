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

      target_user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
      },

      target_customer_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "customers",
          key: "id",
        },
      },

      type: {
        type: DataTypes.ENUM(
          "ORDER",
          "TICKET",
          "INVENTORY",
          "PAYMENT",
          "VIDEO",
          "SYSTEM"
        ),
        allowNull: false,
        defaultValue: "SYSTEM",
      },

      // channel: {
      //   type: DataTypes.ENUM("Email", "SMS", "In-App"),
      //   allowNull: false,
      // },

      title: { type: DataTypes.STRING, allowNull: false },

      message: { type: DataTypes.TEXT, allowNull: false },

      state: {
        type: DataTypes.ENUM("info", "success", "warning", "error"),
        allowNull: false,
        defaultValue: "info",
      },

      data: { type: DataTypes.JSON, allowNull: true },
      is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
      read_at: { type: DataTypes.DATE, allowNull: true },
      created_by: { type: DataTypes.UUID, allowNull: true },

      restaurant_id: { type: DataTypes.UUID, allowNull: true },
      branch_id: { type: DataTypes.UUID, allowNull: true },
    },
    {
      tableName: "notifications",
      timestamps: true,
      underscored: true,
    }
  );

  Notification.associate = (models) => {
    Notification.belongsTo(models.User, {
      foreignKey: "target_user_id",
      as: "user",
    });

    Notification.belongsTo(models.Customer, {
      foreignKey: "target_customer_id",
      as: "customer",
    });

    Notification.belongsTo(models.Restaurant, {
      foreignKey: "restaurant_id",
    });

    Notification.belongsTo(models.Branch, {
      foreignKey: "branch_id",
    });
  };

  return Notification;
};
