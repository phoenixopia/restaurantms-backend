const { Op } = require("sequelize");
const {
  sequelize,
  Restaurant,
  Subscription,
  Branch,
  PlanLimit,
} = require("../models");

exports.branchLimit = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const restaurantId = req.user.restaurant_id;

    if (!restaurantId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Restaurant ID is required",
      });
    }

    const restaurant = await Restaurant.findByPk(restaurantId, { transaction });

    if (!restaurant) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    const activeSubscription = await Subscription.findOne({
      where: {
        restaurant_id: restaurant.id,
        status: { [Op.in]: ["active", "trial"] },
        end_date: { [Op.gt]: new Date() },
      },
      transaction,
    });

    if (!activeSubscription) {
      await transaction.rollback();
      return res.status(402).json({
        success: false,
        message:
          "Valid subscription (active or trial) required to create branches",
      });
    }

    const branchLimitRecord = await PlanLimit.findOne({
      where: {
        plan_id: activeSubscription.plan_id,
        key: "branch_limit",
      },
      transaction,
    });

    const branchLimit = branchLimitRecord ? Number(branchLimitRecord.value) : 0;

    const branchCount = await Branch.count({
      where: { restaurant_id: restaurant.id },
      transaction,
    });

    if (branchCount >= branchLimit) {
      await transaction.rollback();
      return res.status(402).json({
        success: false,
        message: `Branch limit reached (${branchLimit})`,
        limit: branchLimit,
        current: branchCount,
      });
    }

    req.restaurantData = {
      restaurantId: restaurant.id,
      branchLimit,
      branchesUsed: branchCount,
    };

    await transaction.commit();
    next();
  } catch (error) {
    await transaction.rollback();
    console.error("Branch limit check failed:", error);
    res.status(500).json({
      success: false,
      message: "Branch creation validation failed",
    });
  }
};
