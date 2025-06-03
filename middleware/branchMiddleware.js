const { Op } = require("sequelize");
const {
  Restaurant,
  Subscription,
  Branch,
  Plan,
  Location,
} = require("../models");

exports.filterActiveBranches = async (req, res, next) => {
  try {
    const restaurantId = req.params.restaurantId;
    if (!restaurantId) {
      return res
        .status(400)
        .json({ success: false, message: "Restaurant ID is required." });
    }

    const branches = await Branch.findAll({
      where: {
        restaurant_id: restaurantId,
        status: "active",
      },
      attributes: [
        "id",
        "opening_time",
        "closing_time",
        "email",
        "phone_number",
        "name",
      ],
      include: [
        {
          model: Location,
          attributes: ["name", "address"],
        },
      ],
    });

    req.branches = branches;
    next();
  } catch (error) {
    console.error("Error filtering active branches:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to filter active branches.",
    });
  }
};

// this is for to check branch limit
exports.branchLimit = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const userId = req.user.id;

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

    const branchCount = await Branch.count({
      where: { restaurant_id: restaurant.id },
      transaction,
    });

    if (branchCount >= activeSubscription.Plan.branch_limit) {
      await transaction.rollback();
      return res.status(402).json({
        success: false,
        message: `Branch limit reached (${activeSubscription.Plan.branch_limit})`,
        limit: activeSubscription.Plan.branch_limit,
        current: branchCount,
      });
    }

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
