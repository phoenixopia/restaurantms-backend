const { Op } = require("sequelize");
const {
  Restaurant,
  Plan,
  // User,
  Subscription,
  sequelize,
} = require("../../models");
const { capitalizeFirstLetter } = require("../../utils/capitalizeFirstLetter");

// created by current user (admin)
exports.getRestaurant = async (req, res) => {
  try {
    const userId = req.user.id;

    const restaurants = await Restaurant.findAll({
      where: { created_by: userId },
      include: [
        {
          model: Subscription,
          attributes: ["plan_id", "expires_at", "status"],
          include: {
            model: Plan,
            attributes: ["name", "price", "billing_cycle"],
          },
        },
        {
          model: Location,
          attributes: ["name", "address"],
        },
      ],
    });
    return res.status(200).json({
      success: true,
      data: restaurants,
    });
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch restaurants",
    });
  }
};

// only active and trial
exports.getAllRestaurants = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const statusFilter = {
      status: ["active", "trial"],
    };

    const paginatedData = await Restaurant.paginate(page, limit, statusFilter);

    return res.status(200).json({
      success: true,
      message: "Restaurants fetched successfully",
      data: paginatedData,
    });
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching restaurants",
    });
  }
};

exports.getRestaurantByName = async (req, res) => {
  try {
    const { name } = req.params;

    const restaurant = await Restaurant.findOne({
      where: {
        restaurant_name: {
          [Op.iLike]: name,
        },
      },
      include: [
        {
          model: Location,
          attributes: ["name", "address"],
        },
      ],
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    if (!["active", "trial"].includes(restaurant.status)) {
      return res.status(403).json({
        success: false,
        message: "Restaurant is not available",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Restaurant found",
      data: restaurant,
    });
  } catch (error) {
    console.error("Error fetching restaurant by name:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching the restaurant",
    });
  }
};

// with location
exports.registerRestaurant = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = req.user.id;
    const {
      restaurant_name,
      logo_url,
      images,
      primary_color,
      language,
      rtl_enabled,
      location_name,
      address,
      latitude,
      longitude,
    } = req.body;

    if (!restaurant_name || !location_name || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Missing required restaurant or location fields",
      });
    }

    const existingRestaurant = await Restaurant.findOne({
      where: { created_by: userId },
      transaction: t,
    });

    if (existingRestaurant) {
      await t.rollback();
      return res.status(409).json({
        success: false,
        message: "Restaurant registered",
      });
    }

    const location = await Location.create(
      {
        name: location_name,
        address,
        latitude,
        longitude,
      },
      { transaction: t }
    );

    const newRestaurant = await Restaurant.create(
      {
        created_by: userId,
        location_id: location.id,
        restaurant_name,
        logo_url,
        images,
        primary_color,
        language,
        rtl_enabled,
        status: "trial",
      },
      { transaction: t }
    );

    await t.commit();
    return res.status(201).json({
      success: true,
      message: "Restaurant registered successfully",
      data: newRestaurant,
    });
  } catch (error) {
    await t.rollback();
    console.error("Register restaurant error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to register restaurant",
    });
  }
};

exports.updateRestaurant = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const {
      location_name,
      address,
      latitude,
      longitude,
      ...restaurantUpdates
    } = req.body;

    const restaurant = await Restaurant.findOne({
      where: { id, created_by: userId },
      include: [{ model: Location }],
      transaction: t,
    });

    if (!restaurant) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Restaurant not found or unauthorized",
      });
    }

    await restaurant.update(restaurantUpdates, { transaction: t });

    if (
      (location_name || address || latitude || longitude) &&
      restaurant.Location
    ) {
      const locationUpdates = {};
      if (location_name) locationUpdates.name = location_name;
      if (address) locationUpdates.address = address;
      if (latitude) locationUpdates.latitude = latitude;
      if (longitude) locationUpdates.longitude = longitude;

      await restaurant.Location.update(locationUpdates, { transaction: t });
    }
    await t.commit();

    return res.status(200).json({
      success: true,
      message: "Restaurant updated successfully",
      data: restaurant,
    });
  } catch (error) {
    await t.rollback();
    console.error("Update restaurant error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update restaurant",
    });
  }
};

exports.deleteRestaurant = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const restaurant = await Restaurant.findOne({
      where: { id, created_by: userId },
      transaction: t,
    });

    if (!restaurant) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Restaurant not found or unauthorized",
      });
    }

    const locationId = restaurant.location_id;

    await restaurant.destroy({ transaction: t });

    await Location.destroy({
      where: { id: locationId },
      transaction: t,
    });
    await t.commit();

    return res.status(200).json({
      success: true,
      message: "Restaurant deleted successfully",
    });
  } catch (error) {
    await t.rollback();
    console.error("Delete restaurant error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete restaurant",
    });
  }
};

// restaurant by nearby location
exports.getNearbyRestaurants = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    const maxDistanceKm = 10;

    const nearbyRestaurants = await sequelize.query(
      `
      SELECT r.*, l.name as location_name, l.address,
        (
          6371 * acos(
            cos(radians(:latitude)) * cos(radians(l.latitude)) *
            cos(radians(l.longitude) - radians(:longitude)) +
            sin(radians(:latitude)) * sin(radians(l.latitude))
          )
        ) AS distance
      FROM restaurants r
      JOIN locations l ON r.location_id = l.id
      WHERE r.status IN ('active', 'trial')
      HAVING distance < :maxDistance
      ORDER BY distance ASC
      `,
      {
        replacements: {
          latitude,
          longitude,
          maxDistance: maxDistanceKm,
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    res.status(200).json({
      success: true,
      data: nearbyRestaurants,
    });
  } catch (error) {
    console.error("Error finding nearby restaurants:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};
