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

  async viewAnalyticsAdminSide(user, filter = "uptoNow") {
    try {
      if (!user.restaurant_id) {
        throwError("Restaurant not found for this user", 404);
      }

      let whereClause = { restaurant_id: user.restaurant_id };
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

      const totalBranches = await Branch.count({
        where: { restaurant_id: user.restaurant_id },
      });

      const totalStaffs = await User.count({
        where: { created_by: user.id },
      });

      const totalRevenueResult = await Order.findOne({
        attributes: [
          [sequelize.fn("SUM", sequelize.col("total_amount")), "totalRevenue"],
        ],
        where: {
          restaurant_id: user.restaurant_id,
          payment_status: "Paid",
          status: "Served",
          ...whereClause,
        },
        raw: true,
      });

      const totalRevenue = parseFloat(totalRevenueResult?.totalRevenue || 0);

      return {
        filter,
        totalBranches,
        totalStaffs,
        totalRevenue,
      };
    } catch (error) {
      throwError(
        error.message || "Failed to fetch admin analytics snapshot",
        500
      );
    }
  },
};

module.exports = AnalyticsSnapshot;
