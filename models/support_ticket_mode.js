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

      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("open", "in-progress", "closed"),
        defaultValue: "open",
      },
      priority: {
        type: DataTypes.ENUM("low", "medium", "high"),
        defaultValue: "medium",
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
    SupportTicket.belongsTo(models.Branch, {
      foreignKey: "branch_id",
    });
    SupportTicket.belongsTo(models.User, { foreignKey: "user_id" });
  };

  return SupportTicket;
};
