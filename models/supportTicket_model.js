"use strict";
const { getGeneratedId } = require('../utils/idGenerator');

module.exports = (sequelize, DataTypes) => {
  const SupportTicket = sequelize.define(
    "SupportTicket",
    {
      id: {
        type: DataTypes.STRING,
        defaultValue: getGeneratedId,
        primaryKey: true,
        allowNull: false,
      },
      restaurant_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "restaurants",
          key: "id",
        },
        onDelete: 'CASCADE'
      },
      user_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      assigned_to: {
        type: DataTypes.STRING,
        references: {
          model: "users",
          key: "id",
        },
      },
      subject: DataTypes.STRING(255),
      description: DataTypes.TEXT,
      status: DataTypes.ENUM("Open", "InProgress", "Resolved", "Closed"),
    },
    {
      tableName: "support_tickets",
      timestamps: true,
      underscored: true,
    }
  );

  SupportTicket.associate = (models) => {
    SupportTicket.belongsTo(models.Restaurant, { foreignKey: "restaurant_id", as: "restaurant" });
    SupportTicket.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
    SupportTicket.belongsTo(models.User, {
      foreignKey: "assigned_to",
      as: "AssignedStaff",
    });
  };

  return SupportTicket;
};
