const {
  User,
  Restaurant,
  Branch,
  Customer,
  Order,
  OrderItem,
  Subscription,
  Plan,
  sequelize,
} = require("../../models");
const throwError = require("../../utils/throwError");
const { Op } = require("sequelize");

const AnalyticsSnapshot = {
  async viewAnalyticsSuperAdmin(user, filter = "uptoNow") {
    try {
      let whereClause = {};
      const now = new Date();
      const startOfWeek = new Date();
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      if (filter === "thisWeek") {
        whereClause.created_at = { [Op.gte]: startOfWeek };
      } else if (filter === "thisMonth") {
        whereClause.created_at = { [Op.gte]: startOfMonth };
      }

      const [totalRestaurants, totalRestaurantAdmins, totalCustomers] =
        await Promise.all([
          Restaurant.count({ where: whereClause }),

          User.count({
            where: {
              created_by: user.id,
              ...whereClause,
            },
          }),

          Customer.count({ where: whereClause }),
        ]);

      const totalRevenueResult = await Subscription.findOne({
        attributes: [
          [sequelize.fn("SUM", sequelize.col("Plan.price")), "totalRevenue"],
        ],
        include: [{ model: Plan, attributes: [] }],
        where: { ...whereClause },
        raw: true,
      });

      const totalRevenue = parseFloat(totalRevenueResult?.totalRevenue || 0);

      const activeRevenue = await Subscription.findAll({
        where: { ...whereClause, status: "active" },
        include: [{ model: Plan, attributes: ["name", "price"] }],
        attributes: [
          "plan_id",
          [sequelize.fn("SUM", sequelize.col("Plan.price")), "totalRevenue"],
        ],
        group: ["plan_id", "Plan.id"],
        raw: true,
        nest: true,
      });

      const activeRevenueByPlan = activeRevenue.map((r) => ({
        planName: r.Plan.name,
        totalRevenue: parseFloat(r.totalRevenue),
      }));

      return {
        filter,
        totalRestaurants,
        totalRestaurantAdmins,
        totalMobileUsers: totalCustomers,
        totalRevenue,
        activeRevenueByPlan,
      };
    } catch (error) {
      throwError(error.message || "Failed to fetch analytics snapshot", 500);
    }
  },


  // async viewAnalyticsAdminSide(user, filter = "uptoNow") {
  //   try {
  //     if (!user.restaurant_id) {
  //       throwError("Restaurant not found for this user", 404);
  //     }

  //     let whereClause = { restaurant_id: user.restaurant_id };
  //     const now = new Date();
  //     const startOfWeek = new Date();
  //     startOfWeek.setDate(now.getDate() - now.getDay());
  //     startOfWeek.setHours(0, 0, 0, 0);

  //     const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  //     if (filter === "thisWeek") {
  //       whereClause.created_at = { [Op.gte]: startOfWeek };
  //     } else if (filter === "thisMonth") {
  //       whereClause.created_at = { [Op.gte]: startOfMonth };
  //     }

  //     const totalBranches = await Branch.count({
  //       where: { restaurant_id: user.restaurant_id },
  //     });

  //     const totalStaffs = await User.count({
  //       where: { created_by: user.id },
  //     });

  //     const totalRevenueResult = await Order.findOne({
  //       attributes: [
  //         [sequelize.fn("SUM", sequelize.col("total_amount")), "totalRevenue"],
  //       ],
  //       where: {
  //         restaurant_id: user.restaurant_id,
  //         payment_status: "Paid",
  //         status: "Served",
  //         ...whereClause,
  //       },
  //       raw: true,
  //     });

  //     const totalRevenue = parseFloat(totalRevenueResult?.totalRevenue || 0);

  //     return {
  //       filter,
  //       totalBranches,
  //       totalStaffs,
  //       totalRevenue,
  //     };
  //   } catch (error) {
  //     throwError(
  //       error.message || "Failed to fetch admin analytics snapshot",
  //       500
  //     );
  //   }
  // },
  async viewAnalyticsAdminSide(user, filter = "uptoNow") {
  try {
    if (!user.restaurant_id) {
      throwError("Restaurant not found for this user", 404);
    }

    const now = new Date();
    const startOfWeek = new Date();
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let whereClause = { restaurant_id: user.restaurant_id };
    if (filter === "thisWeek") {
      whereClause.order_date = { [Op.gte]: startOfWeek };
    } else if (filter === "thisMonth") {
      whereClause.order_date = { [Op.gte]: startOfMonth };
    }

    // -----------------------------
    // Total branches & staff & restaurants
    // -----------------------------
    const totalBranches = await Branch.count({ where: { restaurant_id: user.restaurant_id } });
    const totalStaffs = await User.count({ where: { created_by: user.id } });
    const totalRestaurants = await Restaurant.count();

    // -----------------------------
    // Total revenue
    // -----------------------------
    const totalRevenueResult = await Order.findOne({
      attributes: [[sequelize.fn("SUM", sequelize.col("total_amount")), "totalRevenue"]],
      where: {
        restaurant_id: user.restaurant_id,
        payment_status: "Paid",
        status: "Served",
        ...whereClause,
      },
      raw: true,
    });
    const totalRevenue = parseFloat(totalRevenueResult?.totalRevenue || 0);

    // -----------------------------
    // Weekly Revenue Data (PostgreSQL)
    // -----------------------------
    const weeklyOrders = await Order.findAll({
      attributes: [
        [sequelize.literal('EXTRACT(DOW FROM "order_date")'), 'day'], // 0=Sunday
        [sequelize.fn("SUM", sequelize.col("total_amount")), "revenue"]
      ],
      where: {
        restaurant_id: user.restaurant_id,
        payment_status: "Paid",
        status: "Served",
        ...whereClause,
      },
      group: [sequelize.literal('EXTRACT(DOW FROM "order_date")')],
      raw: true,
    });

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weeklyRevenueData = days.map((dayName, idx) => {
      const dayData = weeklyOrders.find(d => parseInt(d.day) === idx);
      return { name: dayName, revenue: parseFloat(dayData?.revenue || 0) };
    });

    // -----------------------------
    // Top Branches by Revenue
    // -----------------------------
    const branchRevenue = await Order.findAll({
      attributes: [
        "branch_id",
        [sequelize.fn("SUM", sequelize.col("total_amount")), "revenue"]
      ],
      where: {
        restaurant_id: user.restaurant_id,
        payment_status: "Paid",
        status: "Served",
      },
      include: [
        {
          model: Branch,
          attributes: ["name"],
        }
      ],
      group: ["branch_id", "Branch.id", "Branch.name"],
      raw: true,
      nest: true
    });

    const topRestaurantsData = branchRevenue
      .map(b => ({ name: b.Branch.name, revenue: parseFloat(b.revenue) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5); // top 5 branches

    // -----------------------------
    // Return full analytics
    // -----------------------------
    return {
      filter,
      totalRestaurants,
      totalBranches,
      totalStaffs,
      totalRevenue,
      weeklyRevenueData,
      topRestaurantsData,
    };

  } catch (error) {
    throwError(error.message || "Failed to fetch admin analytics snapshot", 500);
  }
}

};

module.exports = AnalyticsSnapshot;
