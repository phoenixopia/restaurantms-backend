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
      max_locations: DataTypes.INTEGER,
      max_staff: DataTypes.INTEGER,
      max_users: DataTypes.INTEGER,
      max_kds: DataTypes.INTEGER,
      kds_enabled: DataTypes.BOOLEAN,
      price: DataTypes.DECIMAL(10, 2),
      billing_cycle: DataTypes.ENUM("monthly", "yearly"),
    },
    {
      tableName: "plans",
      timestamps: true,
      underscored: true,
    }
  );

  Plan.associate = (models) => {
    Plan.hasMany(models.Restaurant, { foreignKey: "plan_id" });
    Plan.hasMany(models.Subscription, { foreignKey: "plan_id" });
  };

  return Plan;
};
