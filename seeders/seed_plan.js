"use strict";

const { sequelize, Plan, PlanLimit } = require("../models");
const { v4: uuidv4 } = require("uuid"); // if you want to manually set id (optional)

module.exports = async () => {
  const plans = await Plan.bulkCreate([
    {
      name: "Basic",
      price: 29.99,
      billing_cycle: "monthly",
    },
    {
      name: "Pro",
      price: 99.99,
      billing_cycle: "monthly",
    },
    {
      name: "Enterprise",
      price: 149.99,
      billing_cycle: "monthly",
    },
  ]);

  // Map plan name to id for foreign key reference
  const planMap = {};
  plans.forEach((plan) => (planMap[plan.name] = plan.id));

  const limits = [
    { plan: "Basic", key: "max_branches", value: 2, data_type: "number" },
    { plan: "Basic", key: "max_locations", value: 1, data_type: "number" },
    { plan: "Basic", key: "max_staff", value: 5, data_type: "number" },
    { plan: "Basic", key: "kds_enabled", value: true, data_type: "boolean" },

    { plan: "Pro", key: "max_branches", value: 5, data_type: "number" },
    { plan: "Pro", key: "max_locations", value: 5, data_type: "number" },
    { plan: "Pro", key: "max_staff", value: 20, data_type: "number" },
    { plan: "Pro", key: "kds_enabled", value: true, data_type: "boolean" },

    { plan: "Enterprise", key: "max_branches", value: 10, data_type: "number" },
    {
      plan: "Enterprise",
      key: "max_locations",
      value: 10,
      data_type: "number",
    },
    { plan: "Enterprise", key: "max_staff", value: 30, data_type: "number" },
    {
      plan: "Enterprise",
      key: "kds_enabled",
      value: true,
      data_type: "boolean",
    },
  ];

  await PlanLimit.bulkCreate(
    limits.map((limit) => ({
      id: uuidv4(),
      plan_id: planMap[limit.plan],
      key: limit.key,
      value: String(limit.value),
      data_type: limit.data_type,
      description: `Limit for ${limit.key}`,
    }))
  );

  console.log("✅ Plans and Plan Limits seeded");
};
