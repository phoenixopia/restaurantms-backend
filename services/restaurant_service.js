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
  // for the owner
  async getUserRestaurants(userId) {
    const restaurant = await Restaurant.findOne({
      where: { created_by: userId },
      attributes: ["id", "has_branch"],
    });

    if (!restaurant) throw new Error("Restaurant not found");

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
        model: Location,
        attributes: ["name", "address"],
      },
    ];

    if (restaurant.has_branch) {
      includes.push({
        model: Branch,
        required: false,
      });
    }
    return await Restaurant.findByPk(restaurant.id, { include: includes });
  },

  // register restaurant
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

  // update restaurant
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

  // delete restaurant
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

  async getRestaurantById(id) {
    const restaurant = await Restaurant.findByPk(id, {
      attributes: ["id", "has_branch"],
    });

    if (!restaurant) throw new Error("Restaurant not found");

    const baseIncludes = [
      {
        model: Location,
        attributes: ["name", "address", "latitude", "longitude"],
      },
    ];

    if (restaurant.has_branch) {
      baseIncludes.push({
        model: Branch,
        required: false,
        include: [
          {
            model: MenuCategory,
            include: [MenuItem],
          },
        ],
      });
    } else {
      baseIncludes.push({
        model: Menu,
        required: false,
        include: [
          {
            model: MenuCategory,
            include: [MenuItem],
          },
        ],
      });
    }

    const fullRestaurant = await Restaurant.findByPk(id, {
      include: baseIncludes,
    });

    return fullRestaurant;
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

  async toggleRestaurantActiveStatus(id) {
    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) throw new Error("Restaurant not found");

    restaurant.is_active = !restaurant.is_active;

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
      if (is_active === "true") {
        filterCondition.is_active = true;
      } else if (is_active === "false") {
        filterCondition.is_active = false;
      }
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

  async createBranch(payload, userId, restaurantId, branchLimit) {
    const transaction = await sequelize.transaction();
    try {
      const { manager_email, ...branchData } = payload;

      const currentCount = await Branch.count({
        where: { restaurant_id: restaurantId },
        transaction,
      });

      if (currentCount >= branchLimit) {
        throw new Error("Branch limit reached");
      }

      let managerId = null;
      if (manager_email) {
        if (!validator.isEmail(manager_email)) {
          throw new Error("Invalid manager email format");
        }

        const manager = await validateManagerByEmail(
          manager_email,
          userId,
          transaction
        );
        managerId = manager.id;
      }

      const branch = await Branch.create(
        {
          ...branchData,
          restaurant_id: restaurantId,
          manager_id: managerId,
        },
        { transaction }
      );

      await Restaurant.update(
        { has_branch: true },
        {
          where: { id: restaurantId },
          transaction,
        }
      );

      await transaction.commit();

      return {
        ...branch.toJSON(),
        usage: {
          limit: branchLimit,
          used: currentCount + 1,
        },
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async updateBranch(branchId, updates, userId) {
    const transaction = await sequelize.transaction();
    try {
      const branch = await Branch.findOne({
        where: { id: branchId },
        include: {
          model: Restaurant,
          where: { created_by: userId },
          required: true,
        },
        transaction,
      });

      if (!branch) {
        throw new Error("Branch not found or access denied");
      }

      const allowedUpdates = [
        "name",
        "location_id",
        "manager_email",
        "phone_number",
        "email",
        "opening_time",
        "closing_time",
        "status",
      ];

      const invalidFields = Object.keys(updates).filter(
        (field) => !allowedUpdates.includes(field)
      );

      if (invalidFields.length > 0) {
        throw new Error(`Invalid fields: ${invalidFields.join(", ")}`);
      }

      if (updates.location_id) {
        const locationExists = await Location.findByPk(updates.location_id, {
          transaction,
        });
        if (!locationExists) {
          throw new Error("Specified location not found");
        }
      }

      if (updates.email && !validator.isEmail(updates.email)) {
        throw new Error("Invalid email format");
      }

      if (
        updates.phone_number &&
        !validator.isMobilePhone(updates.phone_number)
      ) {
        throw new Error("Invalid phone number format");
      }

      if (updates.manager_email) {
        if (!validator.isEmail(updates.manager_email)) {
          throw new Error("Invalid manager email format");
        }

        const manager = await validateManagerByEmail(
          updates.manager_email,
          userId,
          transaction
        );

        updates.manager_id = manager.id;
      }

      delete updates.manager_email;

      await branch.update(updates, { transaction });

      const updatedBranch = await Branch.findByPk(branchId, {
        include: [Location, { model: User, as: "manager" }],
        transaction,
      });

      await transaction.commit();
      return updatedBranch;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async deleteBranch(branchId, userId) {
    const transaction = await sequelize.transaction();
    try {
      const branch = await Branch.findOne({
        where: { id: branchId },
        include: {
          model: Restaurant,
          where: { created_by: userId },
          required: true,
        },
        transaction,
      });

      if (!branch) {
        throw new Error("Branch not found or access denied");
      }

      await branch.destroy({ transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};

module.exports = RestaurantService;
