const { Restaurant, Branch } = require("../models");

exports.checkRestaurantStatus = async (req, res, next) => {
  try {
    let restaurant;

    if (req.user?.restaurant_id) {
      restaurant = await Restaurant.findByPk(req.user.restaurant_id);
    } else if (req.user?.branch_id) {
      const branch = await Branch.findByPk(req.user.branch_id);
      if (branch) {
        restaurant = await Restaurant.findByPk(branch.restaurant_id);
      }
    }

    if (!restaurant) {
      return res.status(403).json({
        success: false,
        message: "No associated restaurant found for this account",
      });
    }

    if (["active"].includes(restaurant.status)) {
      req.restaurant = restaurant;
      return next();
    }

    if (restaurant.status === "expired") {
      return res.status(403).json({
        success: false,
        message: "Subscription expired. Please renew to continue.",
      });
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. Restaurant status is: ${restaurant.status}`,
    });
  } catch (err) {
    console.error("Error in checkRestaurantStatus middleware:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
