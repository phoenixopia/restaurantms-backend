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
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      billing_cycle: {
        type: DataTypes.ENUM("monthly", "yearly"),
        allowNull: false,
      },
    },
    {
      tableName: "plans",
      timestamps: true,
      
      underscored: true,
      defaultScope: {
        attributes: {
          exclude: ["createdAt", "updatedAt"],
        },
      },
    }
  );

  Plan.associate = (models) => {
    Plan.hasMany(models.Subscription, { foreignKey: "plan_id" });
    Plan.hasMany(models.PlanLimit, {
      foreignKey: "plan_id",
      onDelete: "CASCADE",
    });
  };

  Plan.getPlansWithPricing = async function () {
    const plans = await this.findAll();
    const groupedPlans = {};

    plans.forEach((plan) => {
      if (!groupedPlans[plan.name]) {
        groupedPlans[plan.name] = {
          id: plan.id,
          name: plan.name,
          pricing: [],
        };
      }
      groupedPlans[plan.name].pricing.push({
        cycle: plan.billing_cycle,
        price: plan.price,
      });
    });

    return Object.values(groupedPlans);
  };

  return Plan;
};
