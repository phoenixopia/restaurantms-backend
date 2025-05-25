"use strict";

module.exports = (sequelize, DataTypes) => {
  const Plan = sequelize.define(
    "Plan",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: { isIn: [["Basic", "Pro", "Enterprise"]] },
      },
      max_branches: DataTypes.INTEGER,
      max_locations: DataTypes.INTEGER,
      max_staff: DataTypes.INTEGER,
      max_users: DataTypes.INTEGER,
      max_kds: DataTypes.INTEGER,
      kds_enabled: DataTypes.BOOLEAN,
      price: DataTypes.DECIMAL(10, 2),
    },
    {
      tableName: "plans",
      timestamps: true,
      underscored: true,
      defaultScope: {
        attributes: {
          exclude: ["id", "created_at", "updated_at"],
        },
      },
    }
  );

  Plan.associate = (models) => {
    Plan.hasMany(models.Subscription, { foreignKey: "plan_id" });
  };

  return Plan;
};
