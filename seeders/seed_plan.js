"use strict";

const { Plan, PlanLimit } = require("../models");
const { v4: uuidv4 } = require("uuid");

module.exports = async () => {
  const planDefinitions = [
    { name: "Basic", price: 29.99, billing_cycle: "monthly" },
    { name: "Pro", price: 99.99, billing_cycle: "monthly" },
    { name: "Enterprise", price: 149.99, billing_cycle: "monthly" },
  ];

  const planMap = {};

  for (const def of planDefinitions) {
    const [plan, created] = await Plan.findOrCreate({
      where: { name: def.name },
      defaults: {
        id: uuidv4(),
        price: def.price,
        billing_cycle: def.billing_cycle,
      },
    });

    planMap[def.name] = plan.id;

    if (created) {
      console.log(`✅ Plan created: ${def.name}`);
    } else {
      console.log(`ℹ️ Plan already exists: ${def.name}`);
    }
  }

  const planLimits = [
    { plan: "Basic", key: "max_branches", value: 3, data_type: "number" },
    { plan: "Basic", key: "storage_quota_gb", value: 10, data_type: "number" },
    { plan: "Basic", key: "max_staff", value: 5, data_type: "number" },

    { plan: "Pro", key: "max_branches", value: 5, data_type: "number" },
    { plan: "Pro", key: "storage_quota_gb", value: 50, data_type: "number" },
    { plan: "Pro", key: "max_staff", value: 20, data_type: "number" },

    { plan: "Enterprise", key: "max_branches", value: 10, data_type: "number" },
    {
      plan: "Enterprise",
      key: "storage_quota_gb",
      value: 200,
      data_type: "number",
    },
    { plan: "Enterprise", key: "max_staff", value: 50, data_type: "number" },
  ];

  for (const limit of planLimits) {
    const [planLimit, created] = await PlanLimit.findOrCreate({
      where: { plan_id: planMap[limit.plan], key: limit.key },
      defaults: {
        id: uuidv4(),
        value: String(limit.value),
        data_type: limit.data_type,
        description: `Limit for ${limit.key} in ${limit.plan} plan`,
      },
    });

    if (created) {
      console.log(`✅ Plan limit created: ${limit.plan} -> ${limit.key}`);
    } else {
      console.log(
        `ℹ️ Plan limit already exists: ${limit.plan} -> ${limit.key}`
      );
    }
  }

  console.log("🎉 Plans and Plan Limits seeding complete");
};
