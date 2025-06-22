const { Op } = require("sequelize");
const validator = require("validator");
const {
  Restaurant,
  Plan,
  Location,
  Subscription,
  sequelize,
} = require("../../models");
const fs = require("fs");
const path = require("path");

const UPLOADS_DIR = path.join(
  "C:",
  "Users",
  "HP",
  "Desktop",
  "phoenix",
  "restaurantms-backend",
  "uploads"
);
const SERVER_URL = process.env.SERVER_URL || "http://127.0.0.1:8000";
const BASE_URL = "/uploads";

// Modified URL generator with proper encoding
const getFileUrl = (filename) => {
  if (!filename) return null;
  const encodedFilename = encodeURIComponent(filename);
  return `${SERVER_URL}/uploads/${encodedFilename}`;
};

const getFilePath = (filename) => path.join(UPLOADS_DIR, filename);
const getPublicUrl = (filename) =>
  filename ? `${SERVER_URL}/uploads/${filename}` : null;

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

exports.registerRestaurant = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { body, files } = req;
    const userId = req.user.id;

    const requiredFields = ["restaurant_name", "location_name", "address"];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Create location
    const location = await Location.create(
      {
        name: body.location_name,
        address: body.address,
        latitude: body.latitude,
        longitude: body.longitude,
      },
      { transaction }
    );

    // Process files with validation
    const processFileUrls = (fileArray) => {
      if (!fileArray) return [];
      return fileArray.map((file) => {
        const url = getFileUrl(file.filename);
        if (
          !validator.isURL(url, {
            require_protocol: true,
            allow_localhost: true,
          })
        ) {
          throw new Error(`Invalid file URL: ${url}`);
        }
        return url;
      });
    };

    const logoUrl = files?.logo?.[0] ? processFileUrls(files.logo)[0] : null;
    const imagesUrls = processFileUrls(files?.images);

    // Create restaurant
    const restaurant = await Restaurant.create(
      {
        created_by: userId,
        location_id: location.id,
        restaurant_name: body.restaurant_name,
        logo_url: logoUrl,
        images: imagesUrls,
        primary_color: body.primary_color,
        language: body.language,
        rtl_enabled: body.rtl_enabled,
        status: "trial",
      },
      { transaction }
    );

    await transaction.commit();
    return res.status(201).json({ success: true, data: restaurant });
  } catch (error) {
    await transaction.rollback();
    console.error("Registration error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.updateRestaurant = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      params: { id },
      body,
      files,
    } = req;
    const userId = req.user.id;
    const updates = {};
    const filesToCleanup = [];

    // Validate required parameters
    if (!id || !validator.isUUID(id)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid restaurant ID",
      });
    }

    // Get restaurant with location
    const restaurant = await Restaurant.findOne({
      where: { id, created_by: userId },
      include: [Location],
      transaction,
    });

    if (!restaurant) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    // Handle logo update
    if (files?.logo?.[0]) {
      const newLogo = files.logo[0];
      const logoUrl = getFileUrl(newLogo.filename);

      // Validate URL format
      if (
        !validator.isURL(logoUrl, {
          protocols: ["http", "https"],
          require_protocol: true,
          allow_localhost: true,
        })
      ) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Invalid logo URL format: ${logoUrl}`,
        });
      }

      updates.logo_url = logoUrl;
      filesToCleanup.push(newLogo.path);

      // Delete old logo
      if (restaurant.logo_url) {
        const oldFilename = decodeURIComponent(
          restaurant.logo_url.split("/").pop()
        );
        try {
          fs.unlinkSync(getFilePath(oldFilename));
        } catch (err) {
          console.warn("⚠️ Failed to delete old logo:", err.message);
        }
      }
    }

    // Handle images update
    if (files?.images?.length) {
      const newImages = files.images.map((img) => ({
        filename: img.filename,
        path: img.path,
        url: getFileUrl(img.filename),
      }));

      // Validate image URLs
      const invalidImage = newImages.find(
        ({ url }) =>
          !validator.isURL(url, {
            protocols: ["http", "https"],
            require_protocol: true,
            allow_localhost: true,
          })
      );

      if (invalidImage) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Invalid image URL: ${invalidImage.url}`,
        });
      }

      updates.images = newImages.map((img) => img.url);
      filesToCleanup.push(...newImages.map((img) => img.path));

      // Delete old images
      if (restaurant.images?.length) {
        restaurant.images.forEach((oldUrl) => {
          const oldFilename = decodeURIComponent(oldUrl.split("/").pop());
          try {
            fs.unlinkSync(getFilePath(oldFilename));
          } catch (err) {
            console.warn("⚠️ Failed to delete old image:", err.message);
          }
        });
      }
    }

    // Validate and prepare field updates
    if (body.restaurant_name?.trim()) {
      updates.restaurant_name = body.restaurant_name.trim();
    }

    if (body.primary_color) {
      if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(body.primary_color)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Invalid primary color format",
        });
      }
      updates.primary_color = body.primary_color;
    }

    if (body.language) {
      const validLanguages = ["en", "ar"];
      if (!validLanguages.includes(body.language.toLowerCase())) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Invalid language code",
        });
      }
      updates.language = body.language.toLowerCase();
    }

    if (typeof body.rtl_enabled === "boolean") {
      updates.rtl_enabled = body.rtl_enabled;
    }

    // Handle location updates
    if (body.location_name || body.address) {
      try {
        await Location.update(
          {
            name: body.location_name || restaurant.Location.name,
            address: body.address || restaurant.Location.address,
            latitude: body.latitude || restaurant.Location.latitude,
            longitude: body.longitude || restaurant.Location.longitude,
          },
          {
            where: { id: restaurant.location_id },
            transaction,
          }
        );
      } catch (locationError) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Location update failed",
          error: locationError.message,
        });
      }
    }

    // Update restaurant
    try {
      await Restaurant.update(updates, {
        where: { id },
        transaction,
        validate: true,
      });
    } catch (updateError) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        error: updateError.errors?.map((e) => e.message) || updateError.message,
      });
    }

    await transaction.commit();

    // Cleanup temporary files
    filesToCleanup.forEach((filePath) => {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanError) {
        console.warn("⚠️ Failed to clean temp file:", cleanError.message);
      }
    });

    // Fetch updated restaurant
    const updatedRestaurant = await Restaurant.findByPk(id, {
      include: [Location, Subscription],
    });

    return res.json({
      success: true,
      data: updatedRestaurant,
    });
  } catch (error) {
    await transaction.rollback();

    // Cleanup uploaded files on error
    if (files) {
      Object.values(files).forEach((fileArray) => {
        fileArray.forEach((file) => {
          try {
            fs.unlinkSync(getFilePath(decodeURIComponent(file.filename)));
          } catch (cleanError) {
            console.warn("⚠️ Failed to cleanup file:", cleanError.message);
          }
        });
      });
    }

    return res.status(500).json({
      success: false,
      message: "Update failed",
      error: error.message,
    });
  }
};

exports.deleteRestaurant = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const restaurant = await Restaurant.findOne({
      where: { id, created_by: userId },
      transaction,
    });

    if (!restaurant) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    // Delete associated files
    if (restaurant.logo_url) {
      const filename = restaurant.logo_url.split("/").pop();
      fs.unlinkSync(getFilePath(filename));
    }

    if (restaurant.images?.length) {
      restaurant.images.forEach((url) => {
        const filename = url.split("/").pop();
        fs.unlinkSync(getFilePath(filename));
      });
    }

    await restaurant.destroy({ transaction });
    await transaction.commit();

    return res.json({
      success: true,
      message: "Restaurant deleted successfully",
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({
      success: false,
      message: "Deletion failed",
      error: error.message,
    });
  }
};

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

exports.getAllRestaurantsRegistered = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows: restaurants } = await Restaurant.findAndCountAll({
      offset,
      limit,
      order: [["createdAt", "DESC"]],
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

    const totalPages = Math.ceil(count / limit);

    return res.status(200).json({
      success: true,
      message: "Restaurants fetched successfully",
      data: {
        restaurants,
        pagination: {
          totalItems: count,
          totalPages,
          currentPage: page,
          pageSize: limit,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching all restaurants for super admin:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch restaurants",
    });
  }
};

exports.changeRestaurantStatus = async (req, res) => {
  const allowedStatuses = ["active", "trial", "cancelled", "expired"];
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Restaurant ID is required",
      });
    }

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status is required and must be one of: ${allowedStatuses.join(
          ", "
        )}`,
      });
    }
    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    restaurant.status = status;
    await restaurant.save();

    return res.status(200).json({
      success: true,
      message: `Restaurant status updated to ${status}`,
      data: restaurant,
    });
  } catch (error) {
    console.error("Error updating restaurant status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update restaurant status",
      error: error.message,
    });
  }
};

/*
getRestaurant
getAllRestaurants
getRestaurantByName
registerRestaurant
updateRestaurant
*/
