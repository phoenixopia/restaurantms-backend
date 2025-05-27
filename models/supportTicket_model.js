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
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      assigned_to: {
        type: DataTypes.UUID,
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
