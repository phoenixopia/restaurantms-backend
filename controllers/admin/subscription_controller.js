const { Subscription, Restaurant, Plan, sequelize } = require("../../models");
const { capitalizeName } = require("../../utils/capitalizeFirstLetter");

exports.createSubscription = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { restaurant_id, plan_name, billing_cycle, billing_provider } =
      req.body;

    if (!restaurant_id || !plan_name || !billing_cycle) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    if (!["monthly", "yearly"].includes(billing_cycle.toLowerCase())) {
      return res
        .status(400)
        .json({ message: "Invalid billing cycle. Use 'monthly' or 'yearly'." });
    }

    const restaurant = await Restaurant.findByPk(restaurant_id, {
      transaction: t,
    });
    if (!restaurant) {
      await t.rollback();
      return res.status(404).json({ message: "Restaurant not found." });
    }

    const formattedPlanName = capitalizeName(plan_name);

    const plan = await Plan.findOne({
      where: { name: formattedPlanName },
      transaction: t,
    });

    if (!plan) {
      await t.rollback();
      return res
        .status(404)
        .json({ message: `Plan '${formattedPlanName}' not found.` });
    }

    const existingSub = await Subscription.findOne({
      where: {
        restaurant_id,
        status: "active",
      },
      transaction: t,
    });

    if (existingSub) {
      await t.rollback();
      return res.status(409).json({
        message: "An active subscription already exists for this restaurant.",
      });
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    if (billing_cycle.toLowerCase() === "monthly") {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    const subscription = await Subscription.create(
      {
        restaurant_id,
        plan_id: plan.id,
        billing_cycle: billing_cycle.toLowerCase(),
        start_date: startDate,
        end_date: endDate,
        billing_provider: billing_provider || null,
        created_by_user_id: req.user?.id || null,
        status: "active",
      },
      { transaction: t }
    );

    await t.commit();

    return res.status(201).json({
      message: "Subscription created successfully.",
      data: subscription,
    });
  } catch (error) {
    console.error("Subscription creation failed:", error);
    await t.rollback();
    return res.status(500).json({ message: "Internal server error." });
  }
};
