const { Subscription, Restaurant, Plan, sequelize } = require("../../models");
const { capitalizeName } = require("../../utils/capitalizeFirstLetter");

exports.createSubscription = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { restaurant_id, plan_name, billing_cycle, billing_provider } =
      req.body;
    const user_id = req.user?.id;

    // Validate required fields
    const requiredFields = { restaurant_id, plan_name, billing_cycle };
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
        code: "MISSING_FIELDS",
      });
    }

    // Validate billing cycle
    const validBillingCycles = new Set(["monthly", "yearly"]);
    if (!validBillingCycles.has(billing_cycle.toLowerCase())) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid billing cycle. Use 'monthly' or 'yearly'.",
        code: "INVALID_BILLING_CYCLE",
      });
    }

    // Validate billing provider if provided
    if (billing_provider) {
      const validProviders = new Set(["stripe", "paypal", "telebirr"]);
      if (!validProviders.has(billing_provider.toLowerCase())) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message:
            "Invalid billing provider. Use 'stripe', 'paypal', or 'telebirr'.",
          code: "INVALID_PROVIDER",
        });
      }
    }

    // Check restaurant existence
    const restaurant = await Restaurant.findByPk(restaurant_id, {
      transaction: t,
    });
    if (!restaurant) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Restaurant not found.",
        code: "RESTAURANT_NOT_FOUND",
      });
    }

    // Find plan with formatted name
    const formattedPlanName = capitalizeName(plan_name);
    const plan = await Plan.findOne({
      where: { name: formattedPlanName },
      transaction: t,
    });

    if (!plan) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: `Plan '${formattedPlanName}' not found.`,
        code: "PLAN_NOT_FOUND",
      });
    }

    // Check for existing active subscription
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
        success: false,
        message: "Active subscription already exists for this restaurant.",
        code: "DUPLICATE_SUBSCRIPTION",
      });
    }

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date(startDate);

    if (billing_cycle.toLowerCase() === "monthly") {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    // Format dates for DATEONLY field
    const formatDate = (date) => date.toISOString().split("T")[0];

    // Create subscription
    const subscription = await Subscription.create(
      {
        restaurant_id,
        plan_id: plan.id,
        billing_cycle: billing_cycle.toLowerCase(),
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        billing_provider: billing_provider
          ? billing_provider.toLowerCase()
          : null,
        created_by_user_id: user_id,
        status: "active",
      },
      { transaction: t }
    );

    await t.commit();

    return res.status(201).json({
      success: true,
      message: "Subscription created successfully.",
      data: {
        id: subscription.id,
        restaurant_id: subscription.restaurant_id,
        plan_id: subscription.plan_id,
        billing_cycle: subscription.billing_cycle,
        start_date: subscription.start_date,
        end_date: subscription.end_date,
        billing_provider: subscription.billing_provider,
        status: subscription.status,
      },
    });
  } catch (error) {
    await t.rollback();
    console.error("Subscription creation failed:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      code: "SERVER_ERROR",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
