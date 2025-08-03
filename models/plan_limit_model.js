"use strict";

module.exports = (sequelize, DataTypes) => {
  const PlanLimit = sequelize.define(
    "PlanLimit",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      plan_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "plans", key: "id" },
      },

      key: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      value: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      data_type: {
        type: DataTypes.ENUM("number", "boolean", "string"),
        allowNull: false,
      },

      description: DataTypes.TEXT,
    },
    {
      tableName: "plan_limits",
      timestamps: true,
      underscored: true,
      defaultScope: {
        attributes: {
          exclude: ["created_at", "updated_at"],
        },
      },
    }
  );

  PlanLimit.associate = (models) => {
    PlanLimit.belongsTo(models.Plan, {
      foreignKey: "plan_id",
    });
  };

  return PlanLimit;
};
