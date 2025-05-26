const { Restaurant } = require("../models/index");

const checkRestaurantStatus = async (req, res, next) => {
  try {
    const restaurantId = req.user?.restaurant_id;

    if (!restaurantId) {
      return res.status(403).json({
        success: false,
        message: "No restaurant access linked to your account.",
      });
    }

    const restaurant = await Restaurant.findByPk(restaurantId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found.",
      });
    }

    const { status } = restaurant;

    if (status === "active" || status === "trial") {
      req.restaurant = restaurant;
      return next();
    }

    if (status === "expired") {
      return res.status(403).json({
        success: false,
        message: "Your subscription has expired. Please subscribe to continue.",
      });
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. Restaurant status is: ${status}`,
    });
  } catch (err) {
    console.error("Error in checkRestaurantStatus middleware:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

module.exports = checkRestaurantStatus;
