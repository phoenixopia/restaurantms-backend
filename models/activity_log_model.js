"use strict";

module.exports = (sequelize, DataTypes) => {
  const ActivityLog = sequelize.define(
    "ActivityLog",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      user_id: {
        type: DataTypes.UUID,
        references: {
          model: "users",
          key: "id",
        },
      },

      // affected module(model)
      module: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      // what was done
      action: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      details: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      tableName: "activity_logs",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
      underscored: true,
    }
  );

  ActivityLog.associate = (models) => {
    ActivityLog.belongsTo(models.User, {
      foreignKey: "user_id",
    });
  };

  return ActivityLog;
};
