const { Subscription, Restaurant, Plan, Role, RestaurantUser, sequelize } = require("../models/index");
const { capitalizeName } = require("../utils/capitalizeFirstLetter");


// ===CREATE SUBSCRIPTION ===
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


// === GET ALL Subscription ===
exports.getAllSubscriptions = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const pageSize = parseInt(limit, 10) || 10;
    const dataCount = await Subscription.count();
    const totalPages = Math.ceil(dataCount / pageSize);
    const data = await Subscription.findAll({
      offset: (pageNumber - 1) * pageSize,
      limit: pageSize,
      order: [['updatedAt', 'DESC']], 
    });
    return res.status(200).json({ 
      success: true, 
      data,
      pagination: { total: dataCount, page: pageNumber, pageSize, totalPages,}
    });
  } catch (error) {
    console.error('Get All Subscription Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error.', error: error.message });}
};


// === GET Subscription For User ===
exports.getSubscriptionForUser = async (req, res, next) => {
  try {
    const role = await Role.findByPk(req.user.role_id);

    const { page, limit } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const pageSize = parseInt(limit, 10) || 10;

    let subscriptionFilter = {};

    if (role.name !== 'super_admin') {
      // Step 1: Get user's restaurant IDs
      const userRestaurants = await RestaurantUser.findAll({
        where: { user_id: req.user.id },
        attributes: ['restaurant_id']
      });

      const restaurantIds = userRestaurants.map(r => r.restaurant_id);

      if (restaurantIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: [],
          pagination: {
            total: 0,
            page: pageNumber,
            pageSize,
            totalPages: 0
          }
        });
      }

      // Step 2: Find subscription_ids used by these restaurants
      const restaurants = await Restaurant.findAll({
        where: { id: { [Op.in]: restaurantIds } },
        attributes: ['subscription_id']
      });

      const subscriptionIds = [
        ...new Set(restaurants.map(r => r.subscription_id).filter(Boolean)) // filter out nulls
      ];

      if (subscriptionIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: [],
          pagination: {
            total: 0,
            page: pageNumber,
            pageSize,
            totalPages: 0
          }
        });
      }

      subscriptionFilter.id = { [Op.in]: subscriptionIds };
    }

    // Step 3: Paginate subscriptions
    const dataCount = await Subscription.count({
      where: subscriptionFilter
    });

    const totalPages = Math.ceil(dataCount / pageSize);

    const data = await Subscription.findAll({
      where: subscriptionFilter,
      include: [
        { model: Plan, as: 'plan' },
        {
          model: Restaurant,
          as: 'restaurants'
        }
      ],
      offset: (pageNumber - 1) * pageSize,
      limit: pageSize,
      order: [['updatedAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        total: dataCount,
        page: pageNumber,
        pageSize,
        totalPages
      }
    });

  } catch (error) {
    console.error('Get All Subscription Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error.',
      error: error.message
    });
  }
};

// exports.getSubscriptionForUser = async (req, res, next) => {
//   try {
//     // Get user's role
//     const role = await Role.findByPk(req.user.role_id);

//     let whereClause = {};

//     // Restrict menus if not super_admin
//     if (role.name !== 'super_admin') {
//       // Get assigned restaurant IDs for current user
//       const userRestaurants = await RestaurantUser.findAll({
//         where: { user_id: req.user.id },
//         attributes: ['restaurant_id']
//       });

//       const restaurantIds = userRestaurants.map(r => r.restaurant_id);

//       // If no restaurant assignments found
//       if (restaurantIds.length === 0) {
//         return res.status(200).json({
//           success: true,
//           data: [],
//           pagination: {
//             total: 0,
//             page: pageNumber,
//             pageSize,
//             totalPages: 0
//           }
//         });
//       }

//       // get subscription_id
//       whereClause.restaurant_id = { [Op.in]: restaurantIds };
//     }

//     const { page, limit } = req.query;
//     const pageNumber = parseInt(page, 10) || 1;
//     const pageSize = parseInt(limit, 10) || 10;
//     const dataCount = await Subscription.count({include: [{whereClause, model: Restaurant, as: 'restaurants'}]});
//     const totalPages = Math.ceil(dataCount / pageSize);
//     const data = await Subscription.findAll({
//       include: [
//         {whereClause, model: Restaurant, as: 'restaurants'},
//         {model: Plan, as: 'plan'},
//       ],
//       offset: (pageNumber - 1) * pageSize,
//       limit: pageSize,
//       order: [['updatedAt', 'DESC']], 
//     });
//     console.log("data:", data)

//     return res.status(200).json({ 
//       success: true, 
//       data,
//       pagination: { total: dataCount, page: pageNumber, pageSize, totalPages,}
//     });
//   } catch (error) {
//     console.error('Get All Subscription Error:', error);
//     return res.status(500).json({ success: false, message: 'Internal Server Error.', error: error.message });}
// };
