const { Subscription, Restaurant, Plan, sequelize } = require("../models");
const { capitalizeName } = require("../utils/capitalizeFirstLetter");
const throwError = require("../utils/throwError");

const SubscriptionService = {
  async subscribe(data, user_id) {
    const t = await sequelize.transaction();

    try {
      const { restaurant_name, plan_name, billing_cycle, billing_provider } =
        data;

      if (!restaurant_name || !plan_name || !billing_cycle) {
        throwError("Missing required fields", 400);
      }

      const validBillingCycles = ["monthly", "yearly"];
      if (!validBillingCycles.includes(billing_cycle.toLowerCase())) {
        throwError("Invalid billing cycle. Use 'monthly' or 'yearly'.", 400);
      }

      const validProviders = ["stripe", "paypal", "telebirr", "cash", "CBE"];
      if (
        billing_provider &&
        !validProviders.includes(billing_provider.toLowerCase())
      ) {
        throwError("Invalid billing provider.", 400);
      }

      // 🔍 Find restaurant by name (case-insensitive)
      const restaurant = await Restaurant.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("name")),
          "=",
          restaurant_name.toLowerCase()
        ),
        transaction: t,
      });

      if (!restaurant) throwError("Restaurant not found", 404);

      const formattedPlanName = capitalizeName(plan_name);
      const plan = await Plan.findOne({
        where: { name: formattedPlanName },
        transaction: t,
      });
      if (!plan) throwError("Plan not found", 404);

      const existing = await Subscription.findOne({
        where: { restaurant_id: restaurant.id, status: "active" },
        transaction: t,
      });
      if (existing) throwError("Active subscription already exists.", 409);

      const now = new Date();
      const end = new Date(now);
      billing_cycle.toLowerCase() === "monthly"
        ? end.setMonth(end.getMonth() + 1)
        : end.setFullYear(end.getFullYear() + 1);

      const formatDate = (date) => date.toISOString().split("T")[0];

      const subscription = await Subscription.create(
        {
          restaurant_id: restaurant.id,
          plan_id: plan.id,
          billing_cycle: billing_cycle.toLowerCase(),
          start_date: formatDate(now),
          end_date: formatDate(end),
          billing_provider: billing_provider?.toLowerCase() || null,
          created_by_user_id: user_id,
          status: "active",
        },
        { transaction: t }
      );

      await t.commit();
      return subscription;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },
};

module.exports = SubscriptionService;
