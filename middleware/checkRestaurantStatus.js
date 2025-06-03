const { Restaurant } = require("../models");

exports.checkRestaurantStatus = async (req, res, next) => {
  try {
    const user = await user.findByPk(req.user.id, {
      include: [
        {
          association: "Restaurant",
          required: true,
        },
      ],
    });

    if (!user?.Restaurant) {
      return res.status(403).json({
        success: false,
        message: "No restaurant linked to your account",
      });
    }
    const restaurant = user.Restaurant;

    if (["active", "trial"].includes(restaurant.status)) {
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

exports.checkStatusofRestaurant = async (req, res, next) => {
  try {
    const user = await user.findByPk(req.user.id, {
      include: [
        {
          association: "Restaurant",
          required: true,
        },
      ],
    });

    if (!user?.Restaurant) {
      return res.status(403).json({
        success: false,
        message: "No restaurant linked to your account",
      });
    }
    const restaurant = user.Restaurant;

    if (["active", "trial"].includes(restaurant.status)) {
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
