const {
  User,
  Restaurant,
  Branch,
  Customer,
  Order,
  OrderItem,
  Subscription,
  Plan,
  Review,
  Payment,
  sequelize,
} = require("../../models");
const throwError = require("../../utils/throwError");
const { Op, fn, col } = require("sequelize");



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
        whereClause.createdAt = { [Op.gte]: startOfWeek };
      } else if (filter === "thisMonth") {
        whereClause.createdAt = { [Op.gte]: startOfMonth };
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


  // view analytics for admin
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
  },

  // Analytics for branch-level staff
  async getStaffAnalytics({ staffId, restaurantId, branchId }) {
    try {
      const now = new Date();
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      const endOfDay = new Date(now.setHours(23, 59, 59, 999));

      // ---- ORDER ANALYTICS ----
      const baseOrderWhere = {
        restaurant_id: restaurantId,
        branch_id: branchId, // ensure branch-specific
        user_id: staffId,
      };

      const todayOrders = await Order.count({
        where: { ...baseOrderWhere, created_at: { [Op.between]: [startOfDay, endOfDay] } },
      });

      const completedOrders = await Order.count({
        where: { ...baseOrderWhere, status: "Served" },
      });

      const pendingOrders = await Order.count({
        where: { ...baseOrderWhere, status: { [Op.in]: ["Pending", "InProgress", "Preparing"] } },
      });

      const avgOrderValue = await Order.findOne({
        where: baseOrderWhere,
        attributes: [[fn("AVG", col("total_amount")), "avg_value"]],
        raw: true,
      });

      // // ---- PAYMENT ANALYTICS ----
      // const payments = await Payment.findAll({
      //   where: {
      //     restaurant_id: restaurantId,
      //     // branch_id: branchId, // add branch filter
      //     user_id: staffId,
      //   },
      //   raw: true,
      // });

      // const totalRevenueHandled = payments
      //   .filter((p) => p.status === "completed")
      //   .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

      // const totalTips = payments
      //   .filter((p) => p.payment_method === "tip")
      //   .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

      // const paymentStats = { byMethod: {}, byStatus: {} };

      // for (const p of payments) {
      //   paymentStats.byMethod[p.payment_method] = (paymentStats.byMethod[p.payment_method] || 0) + 1;
      //   paymentStats.byStatus[p.status] = (paymentStats.byStatus[p.status] || 0) + 1;
      // }

      // const successRate =
      //   payments.length > 0
      //     ? ((paymentStats.byStatus.completed || 0) / payments.length) * 100
      //     : 0;

      // ---- REVIEW ANALYTICS ----
      const reviews = await Review.findAll({
        where: { restaurant_id: restaurantId },
        include: [
          {
            model: Order,
            attributes: [],
            where: { ...baseOrderWhere },
          },
        ],
        raw: true,
      });

      const avgRating =
        reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;

      // const ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      // reviews.forEach((r) => {
      //   if (ratingDist[r.rating] !== undefined) ratingDist[r.rating]++;
      // });
      const ratingDist = [1, 2, 3, 4, 5].map((r) => ({
        rating: r,
        count: reviews.filter((rev) => rev.rating === r).length,
      }));

      // ---- RETURN STRUCTURED JSON ----
      return {
        summary: {
          todayOrders,
          completedOrders,
          pendingOrders,
          averageOrderValue: parseFloat(avgOrderValue?.avg_value || 0).toFixed(2),
          // totalRevenueHandled: totalRevenueHandled.toFixed(2),
          // totalTips: totalTips.toFixed(2),
          // paymentSuccessRate: parseFloat(successRate.toFixed(1)),
          customerFeedbackScore: parseFloat(avgRating.toFixed(1)),
        },
        ratings: {
          totalReviews: reviews.length,
          distribution: ratingDist,
        },
        // paymentBreakdown: paymentStats,
      };
    } catch (error) {
      throwError(error.message || "Failed to fetch staff analytics snapshot", 500);
    }
  },


};

module.exports = AnalyticsSnapshot;
