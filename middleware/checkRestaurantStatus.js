const { Restaurant } = require("../models");

const checkRestaurantStatus = async (req, res, next) => {
  try {
    const restaurantId = req.user?.restaurant_id;

    if (!restaurantId) {
      return res.status(403).json({
        message: "No restaurant access linked to your account.",
      });
    }

    const restaurant = await Restaurant.findByPk(restaurantId);

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found." });
    }

    if (!["active", "trial"].includes(restaurant.status)) {
      return res.status(403).json({
        message:
          restaurant.status === "expired"
            ? "Your subscription has expired. Please subscribe to continue."
            : `Access denied. Restaurant status is: ${restaurant.status}`,
      });
    }

    req.restaurant = restaurant;
    next();
  } catch (err) {
    console.error("Error in checkRestaurantStatus middleware:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

module.exports = checkRestaurantStatus;
