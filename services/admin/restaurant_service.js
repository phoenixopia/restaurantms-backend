"use strict";

const { Op, QueryTypes, where } = require("sequelize");
const validator = require("validator");
const fs = require("fs");
const path = require("path");
const throwError = require("../../utils/throwError");
const cleanupUploadedFiles = require("../../utils/cleanUploadedFiles");

const { buildPagination } = require("../../utils/pagination");
const {
  User,
  SystemSetting,
  Restaurant,
  Plan,
  Location,
  Subscription,
  Menu,
  Branch,
  MenuCategory,
  MenuItem,
  sequelize,
} = require("../../models");

const UPLOADS_DIR = path.resolve(__dirname, "../../../uploads");
const SERVER_URL = process.env.SERVER_URL || "http://127.0.0.1:8000";
const MAX_NEARBY_DISTANCE_KM = 5;

const getFileUrl = (filename) => {
  if (!filename) return null;
  const encodedFilename = encodeURIComponent(filename);
  return `${SERVER_URL}/uploads/${encodedFilename}`;
};

const getFilePath = (filename) => path.join(UPLOADS_DIR, filename);

const RestaurantService = {
  async getUserRestaurants(userId) {
    const user = await User.findByPk(userId);
    if (!user || !user.restaurant_id) throwError("Restaurant not found", 404);

    const restaurantId = user.restaurant_id;

    const includes = [
      {
        model: Subscription,
        attributes: ["plan_id", "expires_at", "status"],
        include: {
          model: Plan,
          attributes: ["name", "price", "billing_cycle"],
        },
      },
      {
        model: Branch,
        required: true,
        where: { main_branch: true },
        attributes: ["id", "name"],
        include: [
          {
            model: Location,
            attributes: ["name", "address", "latitude", "longitude"],
          },
        ],
      },
      {
        model: Branch,
        required: false,
        where: { main_branch: false },
      },
    ];

    return await Restaurant.findByPk(restaurantId, { include: includes });
  },

  async createRestaurant(body, files, superAdminId) {
    const transaction = await sequelize.transaction();
    try {
      const { restaurant_name, restaurant_admin_id } = body;

      if (!restaurant_name) {
        throwError("restaurant name is required", 400);
      }

      const existingRestaurant = await Restaurant.findOne({
        where: { restaurant_name },
        transaction,
      });

      if (existingRestaurant) {
        throwError("restaurant name must be unique", 400);
      }

      const restaurant = await Restaurant.create(
        {
          restaurant_name,
          status: "trial",
        },
        { transaction }
      );

      if (restaurant_admin_id) {
        const adminUser = await User.findOne({
          where: {
            id: restaurant_admin_id,
            created_by: superAdminId,
          },
          transaction,
        });

        if (!adminUser) {
          throwError(
            "Assigned restaurant admin not found or not created by you",
            404
          );
        }

        await adminUser.update(
          {
            restaurant_id: restaurant.id,
          },
          { transaction }
        );
      }
      const logoUrl = files?.logo?.[0]
        ? getFileUrl(files.logo[0].filename)
        : null;

      const imageUrls =
        files?.images?.map((img) => getFileUrl(img.filename)) || [];

      await SystemSetting.create(
        {
          restaurant_id: restaurant.id,
          logo_url: logoUrl,
          images: imageUrls,
          default_language: body.language || null,
          default_theme: body.theme || "Light",
          primary_color: body.primary_color || null,
          rtl_enabled: body.rtl_enabled === true,
        },
        { transaction }
      );

      await transaction.commit();
      return restaurant;
    } catch (err) {
      await transaction.rollback();
      if (files) {
        await cleanupUploadedFiles(files);
      }
      throw err;
    }
  },

  async updateRestaurant(id, body, files, user) {
    const transaction = await sequelize.transaction();

    try {
      if (!validator.isUUID(id)) throwError("Invalid restaurant ID", 400);

      const restaurant = await Restaurant.findByPk(id, {
        include: [SystemSetting],
        transaction,
      });

      if (!restaurant) throwError("Restaurant not found", 404);

      if (restaurant.id !== user.restaurant_id) {
        throwError(
          "Access denied: You can only update your own restaurant",
          403
        );
      }

      const updates = {};
      const settingUpdates = {};
      const filesToCleanup = [];

      if (files?.logo?.[0]) {
        const newLogo = files.logo[0];
        settingUpdates.logo_url = getFileUrl(newLogo.filename);
        filesToCleanup.push(newLogo.path);

        const oldLogo = restaurant.SystemSetting?.logo_url;
        if (oldLogo) {
          const oldFile = decodeURIComponent(oldLogo.split("/").pop());
          const oldPath = getFilePath(oldFile);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
      }

      if (files?.images?.length) {
        settingUpdates.images = files.images.map((img) =>
          getFileUrl(img.filename)
        );
        filesToCleanup.push(...files.images.map((img) => img.path));

        const oldImages = restaurant.SystemSetting?.images || [];
        for (const imgUrl of oldImages) {
          const oldFile = decodeURIComponent(imgUrl.split("/").pop());
          const oldPath = getFilePath(oldFile);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
      }

      if (body.restaurant_name) updates.restaurant_name = body.restaurant_name;

      if (body.primary_color) settingUpdates.primary_color = body.primary_color;
      if (body.language) settingUpdates.default_language = body.language;
      if (typeof body.rtl_enabled === "boolean")
        settingUpdates.rtl_enabled = body.rtl_enabled;

      if (Object.keys(updates).length) {
        await restaurant.update(updates, { transaction });
      }

      if (Object.keys(settingUpdates).length) {
        if (restaurant.SystemSetting) {
          await restaurant.SystemSetting.update(settingUpdates, {
            transaction,
          });
        } else {
          await SystemSetting.create(
            {
              restaurant_id: restaurant.id,
              ...settingUpdates,
            },
            { transaction }
          );
        }
      }

      await transaction.commit();
      filesToCleanup.forEach((filePath) => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });

      return await Restaurant.findByPk(id, {
        include: [SystemSetting],
      });
    } catch (err) {
      await transaction.rollback();
      if (files) {
        await cleanupUploadedFiles(files);
      }
      throw err;
    }
  },

  async deleteRestaurant(id, user) {
    const transaction = await sequelize.transaction();
    try {
      if (!validator.isUUID(id)) throwError("Invalid restaurant ID", 400);

      const restaurant = await Restaurant.findByPk(id, {
        include: [SystemSetting],
        transaction,
      });
      if (!restaurant) throwError("Restaurant not found", 404);

      // Ensure the authenticated user is deleting their own restaurant
      if (user.restaurant_id !== id) {
        throwError(
          "Access denied: You can only delete your own restaurant",
          403
        );
      }

      // Remove logo file if present
      const setting = restaurant.SystemSetting;

      if (setting?.logo_url) {
        const logoFile = decodeURIComponent(setting.logo_url.split("/").pop());
        const logoPath = getFilePath(logoFile);
        if (fs.existsSync(logoPath)) fs.unlinkSync(logoPath);
      }

      if (setting?.images?.length) {
        for (const img of setting.images) {
          const imgFile = decodeURIComponent(img.split("/").pop());
          const imgPath = getFilePath(imgFile);
          if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        }
      }

      await restaurant.destroy({ transaction });
      await transaction.commit();

      return true;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async getAllRestaurants(query) {
    const { page, limit, offset, order, where } = buildPagination(query);

    const { count, rows } = await Restaurant.findAndCountAll({
      where,
      offset,
      limit,
      order,
      include: [
        {
          model: Menu,
          required: false,
          include: [
            {
              model: MenuCategory,
              attributes: ["id", "name"],
            },
          ],
        },
      ],
    });

    return {
      restaurants: rows,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        pageSize: limit,
      },
    };
  },

  async getRestaurantById(id, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) throwError("Restaurant not found", 404);

    const includes = [
      {
        model: Location,
        attributes: ["name", "address", "latitude", "longitude"],
      },
      {
        model: Branch,
        required: true,
        include: [
          {
            model: MenuCategory,
            required: false,
            offset,
            limit,
            include: [
              {
                model: MenuItem,
                required: false,
                separate: true,
                limit,
              },
            ],
          },
        ],
      },
    ];

    const fullRestaurant = await Restaurant.findByPk(id, {
      include: includes,
    });

    return fullRestaurant;
  },

  async getAllRestaurantsWithMenusAndCheapestItems({ page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;

    const { count, rows: restaurants } = await Restaurant.findAndCountAll({
      attributes: ["id", "restaurant_name", "logo_url"],
      where: {
        status: { [Op.in]: ["active", "trial"] },
      },
      offset,
      limit,
      distinct: true,
      include: [
        {
          model: Menu,
          attributes: ["id", "name"],
          include: [
            {
              model: MenuCategory,
              attributes: ["id", "name"],
              include: [
                {
                  model: MenuItem,
                  attributes: ["id", "name", "unit_price"],
                  separate: true,
                  order: [["unit_price", "ASC"]],
                  limit: 1,
                },
              ],
            },
          ],
        },
      ],
    });

    const totalPages = Math.ceil(count / limit);

    return {
      data: restaurants,
      meta: {
        totalItems: count,
        totalPages,
        currentPage: page,
        pageSize: limit,
      },
    };
  },

  async changeRestaurantStatus(id, status) {
    const allowedStatuses = [
      "active",
      "trial",
      "cancelled",
      "expired",
      "pending",
    ];
    if (!allowedStatuses.includes(status)) {
      throwError("Invalid status", 400);
    }

    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) throwError("Restaurant not found", 404);

    restaurant.status = status;
    await restaurant.save();
    return restaurant;
  },

  async searchRestaurants({
    query,
    nearby,
    lat,
    lng,
    sort = "created_at",
    order = "DESC",
    page = 1,
    limit = 10,
    is_active,
  }) {
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const filterCondition = {};

    if (query) {
      filterCondition.restaurant_name = { [Op.iLike]: `%${query}%` };
    }

    if (typeof is_active !== "undefined") {
      filterCondition.is_active = is_active === "true";
    }

    let data, totalItems;

    if (nearby === "true" && lat && lng) {
      const replacements = {
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        maxDistance: MAX_NEARBY_DISTANCE_KM,
        limit,
        offset,
      };

      let statusCondition = "";
      if (typeof is_active !== "undefined") {
        statusCondition = `AND r.is_active = ${
          is_active === "true" ? "TRUE" : "FALSE"
        }`;
      }

      data = await sequelize.query(
        `
        SELECT r.*, l.name AS location_name, l.address,
          (
            6371 * acos(
              cos(radians(:latitude)) * cos(radians(l.latitude)) *
              cos(radians(l.longitude) - radians(:longitude)) +
              sin(radians(:latitude)) * sin(radians(l.latitude))
            )
          ) AS distance
        FROM restaurants r
        JOIN locations l ON r.location_id = l.id
        WHERE 1=1
        ${statusCondition}
        ${query ? "AND r.restaurant_name ILIKE :query" : ""}
        HAVING distance <= :maxDistance
        ORDER BY distance ASC
        LIMIT :limit OFFSET :offset
        `,
        {
          replacements: {
            ...replacements,
            ...(query ? { query: `%${query}%` } : {}),
          },
          type: QueryTypes.SELECT,
        }
      );

      const countResult = await sequelize.query(
        `
        SELECT COUNT(*) FROM (
          SELECT 1
          FROM restaurants r
          JOIN locations l ON r.location_id = l.id
          WHERE 1=1
          ${statusCondition}
          ${query ? "AND r.restaurant_name ILIKE :query" : ""}
          HAVING (
            6371 * acos(
              cos(radians(:latitude)) * cos(radians(l.latitude)) *
              cos(radians(l.longitude) - radians(:longitude)) +
              sin(radians(:latitude)) * sin(radians(l.latitude))
            )
          ) <= :maxDistance
        ) AS subquery
        `,
        {
          replacements: {
            ...replacements,
            ...(query ? { query: `%${query}%` } : {}),
          },
          type: QueryTypes.SELECT,
        }
      );

      totalItems = parseInt(countResult[0].count);
    } else {
      const allRestaurants = await Restaurant.findAndCountAll({
        where: filterCondition,
        include: [
          {
            model: Location,
            attributes: ["name", "address"],
          },
          {
            model: Menu,
            required: false,
            include: [
              {
                model: MenuCategory,
                attributes: ["id", "name"],
              },
            ],
          },
        ],
        offset,
        limit,
        order: [[sort, order]],
      });

      data = allRestaurants.rows.map((restaurant) =>
        restaurant.get({ plain: true })
      );
      totalItems = allRestaurants.count;
    }

    return {
      data,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        pageSize: limit,
      },
    };
  },
};

module.exports = RestaurantService;
