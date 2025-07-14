"use strict";

module.exports = (sequelize, DataTypes) => {
  const SupportTicket = sequelize.define(
    "SupportTicket",
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
      branch_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "branches",
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

      subject: DataTypes.STRING(255),
      description: DataTypes.TEXT,
      status: {
        type: DataTypes.ENUM("Open", "InProgress", "Resolved", "Closed"),
        defaultValue: "InProgress",
      },
    },
    {
      tableName: "support_tickets",
      timestamps: true,
      underscored: true,
    }
  );

  SupportTicket.associate = (models) => {
    SupportTicket.belongsTo(models.Restaurant, {
      foreignKey: "restaurant_id",
    });
    SupportTicket.belongsTo(models.User, { foreignKey: "user_id" });
  };

  return SupportTicket;
};
