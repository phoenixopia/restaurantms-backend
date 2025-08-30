"use strict";

const { Plan, PlanLimit } = require("../models");
const { v4: uuidv4 } = require("uuid");

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

  const planMap = {};
  plans.forEach((plan) => (planMap[plan.name] = plan.id));

  const limits = [
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

  await PlanLimit.bulkCreate(
    limits.map((limit) => ({
      id: uuidv4(),
      plan_id: planMap[limit.plan],
      key: limit.key,
      value: String(limit.value),
      data_type: limit.data_type,
      description: `Limit for ${limit.key} in ${limit.plan} plan`,
    }))
  );

  console.log("✅ Plans and Plan Limits seeded successfully");
};

/*

"use strict";

const { Plan, PlanLimit } = require("../models");
const { v4: uuidv4 } = require("uuid");

module.exports = async () => {
  // 1. Create Plans
  const plans = await Plan.bulkCreate(
    [
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
    ],
    { returning: true } // ✅ ensures we get IDs back (needed for Postgres)
  );

  // 2. Build a map for easy lookup
  const planMap = {};
  plans.forEach((plan) => {
    planMap[plan.name] = plan.id;
  });

  // 3. Define Plan Limits
  const limits = [
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

  // 4. Insert Plan Limits with correct plan_id
  await PlanLimit.bulkCreate(
    limits.map((limit) => ({
      id: uuidv4(),
      plan_id: planMap[limit.plan],
      key: limit.key,
      value: String(limit.value), // keeping values as string
      data_type: limit.data_type,
      description: `Limit for ${limit.key} in ${limit.plan} plan`,
    }))
  );

  console.log("✅ Plans and Plan Limits seeded successfully");
};


*/
