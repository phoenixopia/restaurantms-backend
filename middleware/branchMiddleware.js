const { Op } = require("sequelize");
const { Restaurant, Subscription, Branch, Plan } = require("../models");

const checkBranchLimit = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const userId = req.user.id;

    // Get user's restaurant
    const restaurant = await Restaurant.findOne({
      where: { created_by: userId },
      transaction,
    });

    if (!restaurant) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    // Check active OR trial subscription
    const activeSubscription = await Subscription.findOne({
      where: {
        restaurant_id: restaurant.id,
        status: { [Op.in]: ["active", "trial"] },
        expires_at: { [Op.gt]: new Date() },
      },
      include: [Plan],
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

    // Count existing branches
    const branchCount = await Branch.count({
      where: { restaurant_id: restaurant.id },
      transaction,
    });

    // Check against plan limit
    if (branchCount >= activeSubscription.Plan.branch_limit) {
      await transaction.rollback();
      return res.status(402).json({
        success: false,
        message: `Branch limit reached (${activeSubscription.Plan.branch_limit})`,
        limit: activeSubscription.Plan.branch_limit,
        current: branchCount,
      });
    }

    // Attach critical information to request object
    req.restaurantData = {
      restaurantId: restaurant.id,
      branchLimit: activeSubscription.Plan.branch_limit,
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

module.exports = checkBranchLimit;
