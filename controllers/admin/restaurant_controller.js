const { where } = require("sequelize");
const { Restaurant, Plan, RestaurantUser, User } = require("../../models/index");

const getRestaurants = async (req, res) => {
  try {
    const userId = req.user.id;

    const restaurantLinks = await RestaurantUser.findAll({
      where: { user_id: userId },
      attributes: ["restaurant_id"],
    });

    const restaurantIds = restaurantLinks.map((link) => link.restaurant_id);

    const restaurants = await Restaurant.findAll({
      where: { id: restaurantIds },
      include: [
        {
          model: Plan,
          attributes: ["name", "price", "billing_cycle"],
        },
      ],
    });

    res.status(200).json({ restaurants });
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const createRestaurant = async (req, res) => {
  try {
    const {
      restaurant_name,
      logo_url,
      primary_color,
      language,
      rtl_enabled,
      plan,
    } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!restaurant_name || !plan) {
      return res
        .status(400)
        .json({ message: "Restaurant name and plan are required." });
    }

    const formattedPlan =
      plan.charAt(0).toUpperCase() + plan.slice(1).toLowerCase();
    const selectedPlan = await Plan.findOne({ where: { name: formattedPlan } });

    if (!selectedPlan) {
      return res.status(404).json({ message: "Plan not found." });
    }

    const newRestaurant = await Restaurant.create({
      restaurant_name,
      logo_url,
      primary_color,
      language,
      rtl_enabled,
      plan_id: selectedPlan.id,
      status: "pending",
    });

    await RestaurantUser.create({
      user_id: user.id,
      restaurant_id: newRestaurant.id,
    });

    await User.update(
      { restaurant_id: newRestaurant.id },
      { where: { id: user.id } }
    );

    return res.status(201).json({
      message: "Restaurant created successfully",
    });
  } catch (error) {
    console.error("Error creating restaurant:", error);
    res.status(500).json({
      message: "Server error while creating restaurant.",
    });
  }
};

const updateRestaurant = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updates = req.body;

    const link = await RestaurantUser.findOne({
      where: { user_id: userId, restaurant_id: id },
    });

    if (!link) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await Restaurant.update(updates, { where: { id } });

    res.status(200).json({ message: "Restaurant updated successfully" });
  } catch (error) {
    console.error("Error updating restaurant:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const link = await RestaurantUser.findOne({
      where: {
        user_id: userId,
        restaurant_id: id,
      },
    });

    if (!link) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this restaurant." });
    }
    await RestaurantUser.destroy({
      where: { user_id: userId, restaurant_id: id },
    });

    await Restaurant.destroy({ where: { id } });

    return res.status(200).json({ message: "Restaurant deleted successfully." });
  } catch (error) {
    console.error("Error deleting restaurant:", error);
    res
      .status(500)
      .json({ message: "Server error while deleting restaurant." });
  }
};

module.exports = {
  getRestaurants,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
};
