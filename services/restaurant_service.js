"use strict";

const { Op, QueryTypes } = require("sequelize");
const validator = require("validator");
const fs = require("fs");
const path = require("path");

const { buildPagination } = require("../utils/pagination");
const {
  Restaurant,
  Plan,
  Location,
  Subscription,
  Menu,
  Branch,
  MenuCategory,
  MenuItem,
  sequelize,
} = require("../models");

const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
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
    return await Restaurant.findOne({
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
  },

  async createRestaurant(body, files, userId) {
    const transaction = await sequelize.transaction();
    try {
      const requiredFields = ["restaurant_name", "location_name", "address"];
      const missingFields = requiredFields.filter((f) => !body[f]);
      if (missingFields.length)
        throw new Error(`Missing fields: ${missingFields.join(", ")}`);

      const location = await Location.create(
        {
          name: body.location_name,
          address: body.address,
          latitude: body.latitude,
          longitude: body.longitude,
        },
        { transaction }
      );

      const logoUrl = files?.logo?.[0]
        ? getFileUrl(files.logo[0].filename)
        : null;

      const imagesUrls =
        files?.images?.map((img) => getFileUrl(img.filename)) || [];

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
      return restaurant;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async updateRestaurant(id, body, files, userId) {
    const transaction = await sequelize.transaction();
    try {
      if (!validator.isUUID(id)) throw new Error("Invalid restaurant ID");

      const restaurant = await Restaurant.findOne({
        where: { id, created_by: userId },
        include: [Location],
        transaction,
      });
      if (!restaurant) throw new Error("Restaurant not found");

      const updates = {};
      const filesToCleanup = [];

      if (files?.logo?.[0]) {
        const newLogo = files.logo[0];
        updates.logo_url = getFileUrl(newLogo.filename);
        filesToCleanup.push(newLogo.path);

        if (restaurant.logo_url) {
          const oldFile = decodeURIComponent(
            restaurant.logo_url.split("/").pop()
          );
          fs.unlinkSync(getFilePath(oldFile));
        }
      }

      if (files?.images?.length) {
        updates.images = files.images.map((img) => getFileUrl(img.filename));
        filesToCleanup.push(...files.images.map((img) => img.path));

        (restaurant.images || []).forEach((url) => {
          const oldFile = decodeURIComponent(url.split("/").pop());
          fs.unlinkSync(getFilePath(oldFile));
        });
      }

      if (body.restaurant_name?.trim())
        updates.restaurant_name = body.restaurant_name.trim();

      if (
        body.primary_color &&
        /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(body.primary_color)
      )
        updates.primary_color = body.primary_color;

      if (["en", "ar"].includes(body.language?.toLowerCase()))
        updates.language = body.language.toLowerCase();

      if (typeof body.rtl_enabled === "boolean")
        updates.rtl_enabled = body.rtl_enabled;

      if (body.location_name || body.address) {
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
      }

      await Restaurant.update(updates, { where: { id }, transaction });
      await transaction.commit();

      filesToCleanup.forEach((f) => fs.unlinkSync(f));
      return await Restaurant.findByPk(id, {
        include: [Location, Subscription],
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async deleteRestaurant(id, userId) {
    const transaction = await sequelize.transaction();
    try {
      const restaurant = await Restaurant.findOne({
        where: { id, created_by: userId },
        transaction,
      });
      if (!restaurant) throw new Error("Restaurant not found");

      if (restaurant.logo_url)
        fs.unlinkSync(getFilePath(restaurant.logo_url.split("/").pop()));

      (restaurant.images || []).forEach((url) =>
        fs.unlinkSync(getFilePath(url.split("/").pop()))
      );

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
          model: Location,
          attributes: ["name", "address"],
        },
        {
          model: Branch,
          required: false,
          include: [
            {
              model: Location,
              attributes: ["name", "address"],
            },
            {
              model: MenuCategory,
              include: [
                {
                  model: MenuItem,
                },
              ],
            },
          ],
        },
        {
          model: Menu,
          required: false,
          include: [
            {
              model: MenuCategory,
              include: [
                {
                  model: MenuItem,
                },
              ],
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

  async changeRestaurantStatus(id, status) {
    const allowedStatuses = ["active", "trial", "cancelled", "expired"];
    if (!allowedStatuses.includes(status)) throw new Error("Invalid status");

    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) throw new Error("Restaurant not found");

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
  }) {
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const filterCondition = {
      status: { [Op.in]: ["active", "trial"] },
    };

    if (query) {
      filterCondition.restaurant_name = { [Op.iLike]: `%${query}%` };
    }

    // Nearby search
    if (nearby === "true" && lat && lng) {
      const replacements = {
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        maxDistance: MAX_NEARBY_DISTANCE_KM,
        limit,
        offset,
      };

      const restaurants = await sequelize.query(
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
        WHERE r.status IN ('active', 'trial')
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
          WHERE r.status IN ('active', 'trial')
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

      return {
        data: restaurants,
        pagination: {
          totalItems: parseInt(countResult[0].count),
          totalPages: Math.ceil(countResult[0].count / limit),
          currentPage: page,
          pageSize: limit,
        },
      };
    }

    // Standard filtered + paginated search with associations
    const { count, rows } = await Restaurant.findAndCountAll({
      where: filterCondition,
      include: [
        {
          model: Location,
          attributes: ["name", "address", "latitude", "longitude"],
        },
        // {
        //   model: Subscription,
        //   attributes: ["plan_id", "expires_at", "status"],
        //   include: {
        //     model: Plan,
        //     attributes: ["name", "price", "billing_cycle"],
        //   },
        // },
        {
          model: Branch,
          required: false,
          include: [
            {
              model: MenuCategory,
              include: [
                {
                  model: MenuItem,
                },
              ],
            },
          ],
        },
        {
          model: Menu,
          required: false,
          include: [
            {
              model: MenuCategory,
              include: [
                {
                  model: MenuItem,
                },
              ],
            },
          ],
        },
      ],
      offset,
      limit,
      order: [[sort, order]],
    });

    return {
      data: rows,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        pageSize: limit,
      },
    };
  },
};

module.exports = RestaurantService;
