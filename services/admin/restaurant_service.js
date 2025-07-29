"use strict";

const { Op, fn, col, literal, QueryTypes, where } = require("sequelize");
const validator = require("validator");
const fs = require("fs");
const path = require("path");
const ReviewService = require("./review_service");
const throwError = require("../../utils/throwError");
const cleanupUploadedFiles = require("../../utils/cleanUploadedFiles");

const { buildPagination } = require("../../utils/pagination");
const {
  User,
  SystemSetting,
  ContactInfo,
  Restaurant,
  VideoLike,
  VideoView,
  Plan,
  Location,
  Subscription,
  Menu,
  Branch,
  MenuCategory,
  MenuItem,
  sequelize,
  Video,
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

const FollowService = require("./follow_service");

const RestaurantService = {
  // ===================
  // this is for the owner of restaurant = restaurant_admin
  async getUserRestaurants(userId) {
    const user = await User.findByPk(userId);
    if (!user || !user.restaurant_id) throwError("Restaurant not found", 404);

    const restaurantId = user.restaurant_id;

    const includes = [
      {
        model: Subscription,
        attributes: ["plan_id", "end_date", "status"],
        include: {
          model: Plan,
          attributes: ["name", "price", "billing_cycle"],
        },
      },
      {
        model: Branch,
        required: false,
        where: { main_branch: true },
        attributes: ["id", "name"],
        include: [
          {
            model: Location,
            attributes: ["address", "latitude", "longitude"],
          },
        ],
      },
      {
        model: SystemSetting,
        required: false,
        attributes: ["logo_url", "images"],
      },
      {
        model: ContactInfo,
        required: false,
        where: {
          restaurant_id: restaurantId,
          module_type: "restaurant",
          module_id: restaurantId,
        },
        attributes: ["type", "value", "is_primary", "module_id"],
      },
    ];

    return await Restaurant.findByPk(restaurantId, {
      include: includes,
      attributes: { exclude: ["created_at", "updated_at"] },
    });
  },

  // this for super admin to get all restaurants with their subscription
  async getAllRestaurantsWithSubscriptions({ page, limit }) {
    const offset = (page - 1) * limit;

    const { count, rows } = await Restaurant.findAndCountAll({
      attributes: { exclude: ["created_at", "updated_at"] },
      include: [
        {
          model: SystemSetting,
          required: false,
          attributes: ["logo_url", "images"],
        },
        {
          model: Subscription,
          attributes: [
            "plan_id",
            "start_date",
            "end_date",
            "payment_method",
            "status",
          ],
          include: [
            {
              model: Plan,
              attributes: ["id", "name", "price", "billing_cycle"],
            },
          ],
        },
      ],
      offset,
      limit,
      order: [["created_at", "DESC"]],
    });

    return {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      data: rows,
    };
  },

  // this by id
  async getRestaurantWithSubscriptionById(restaurantId) {
    const restaurant = await Restaurant.findByPk(restaurantId, {
      attributes: { exclude: ["created_at", "updated_at"] },
      include: [
        {
          model: Subscription,
          attributes: [
            "plan_id",
            "start_date",
            "end_date",
            "payment_method",
            "status",
          ],
          include: [
            {
              model: Plan,
              attributes: ["id", "name", "price", "billing_cycle"],
            },
          ],
        },
      ],
    });

    if (!restaurant) throwError("Restaurant not found", 404);
    return restaurant;
  },

  // creating restaurant with assigning restaurant admin optionally
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

      if (files?.logo?.[0]) {
        const newLogo = files.logo[0];
        const newLogoUrl = getFileUrl(newLogo.filename);
        settingUpdates.logo_url = newLogoUrl;

        const oldLogoUrl = restaurant.SystemSetting?.logo_url;
        if (oldLogoUrl) {
          const oldFile = decodeURIComponent(oldLogoUrl.split("/").pop());
          const oldPath = getFilePath(oldFile);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
      }

      if (files?.images?.length) {
        const newImageUrls = files.images.map((img) =>
          getFileUrl(img.filename)
        );
        settingUpdates.images = newImageUrls;

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
      if (typeof body.rtl_enabled === "boolean") {
        settingUpdates.rtl_enabled = body.rtl_enabled;
      }

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

      if (body.contact_info) {
        const { type, value, is_primary = false } = body.contact_info;

        if (!type || !value)
          throwError("Contact info type and value are required");

        const [contact, created] = await ContactInfo.findOrCreate({
          where: {
            restaurant_id: restaurant.id,
            module_type: "restaurant",
            module_id: restaurant.id,
            type,
          },
          defaults: {
            value,
            is_primary,
          },
          transaction,
        });

        if (!created) {
          await contact.update({ value, is_primary }, { transaction });
        }

        if (is_primary) {
          await ContactInfo.update(
            { is_primary: false },
            {
              where: {
                restaurant_id: restaurant.id,
                module_type: "restaurant",
                module_id: restaurant.id,
                type,
                id: { [Op.ne]: contact.id },
              },
              transaction,
            }
          );
        }
      }

      await transaction.commit();

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

  async addContactInfo(data) {
    return await ContactInfo.create(data);
  },

  // delete restaurant only for the restaurant admin
  async deleteRestaurant(id, user) {
    const transaction = await sequelize.transaction();
    try {
      if (!validator.isUUID(id)) throwError("Invalid restaurant ID", 400);

      const restaurant = await Restaurant.findByPk(id, {
        include: [SystemSetting],
        transaction,
      });
      if (!restaurant) throwError("Restaurant not found", 404);

      if (user.restaurant_id !== id) {
        throwError(
          "Access denied: You can only delete your own restaurant",
          403
        );
      }

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

  // for customer
  async getAllRestaurants(query) {
    const { page, limit, offset, order } = buildPagination(query);

    const totalItems = await Restaurant.count({
      where: { status: { [Op.in]: ["active"] } },
    });

    const rows = await Restaurant.findAll({
      where: { status: { [Op.in]: ["active"] } },
      offset,
      limit,
      order,
      attributes: ["id", "restaurant_name"],
      include: [
        {
          model: Branch,
          required: false,
          where: { main_branch: true },
          attributes: ["id", "name"],
          include: [
            {
              model: Location,
              attributes: ["address", "latitude", "longitude"],
            },
          ],
        },
        {
          model: SystemSetting,
          attributes: ["logo_url", "images"],
          required: false,
        },
        {
          model: ContactInfo,
          as: "owned_contact_info",
          where: { module_type: "restaurant" },
          required: false,
          attributes: ["type", "value", "is_primary"],
        },
        {
          model: MenuCategory,
          required: false,
          distinct: true,
          limit: 3,
          attributes: ["name"],
        },
      ],
    });

    const restaurants = await Promise.all(
      rows.map(async (r) => {
        const plain = r.get({ plain: true });

        plain.MenuCategories = plain.MenuCategories?.map((cat) => ({
          id: cat.id,
          name: cat.name,
        }));

        plain.location =
          (plain.Branches && plain.Branches[0]?.Location) || null;
        delete plain.Branches;

        const { rating, total_reviews } =
          await ReviewService.calculateRestaurantRating(plain.id);
        plain.rating = rating;
        plain.total_reviews = total_reviews;

        return plain;
      })
    );

    const totalPages = Math.ceil(totalItems / limit);

    return {
      restaurants,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        pageSize: limit,
      },
    };
  },

  // for customer
  async getRestaurantById(id, page = 1, limit = 10) {
    const restaurant = await Restaurant.findByPk(id, {
      attributes: ["id", "restaurant_name"],
      include: [
        {
          model: SystemSetting,
          attributes: ["logo_url", "images"],
          required: false,
        },
        {
          model: Branch,
          as: "mainBranch",
          where: { main_branch: true },
          required: false,
          attributes: ["id", "name"],
          include: [
            {
              model: Location,
              attributes: ["address", "latitude", "longitude"],
            },
            {
              model: MenuCategory,
              required: false,
              attributes: ["id", "name", "branch_id"],
              include: [
                {
                  model: MenuItem,
                  required: false,
                  attributes: { exclude: ["createdAt", "updatedAt"] },
                },
              ],
            },
          ],
        },
        {
          model: Branch,
          required: false,
          attributes: ["id", "name"],
        },
      ],
    });

    if (!restaurant) throwError("Restaurant not found", 404);

    const plain = restaurant.get({ plain: true });

    const mainBranch = plain.mainBranch || null;
    const allBranches = plain.Branches || [];

    const { rating, total_reviews } =
      await ReviewService.calculateRestaurantRating(plain.id);

    return {
      id: plain.id,
      restaurant_name: plain.restaurant_name,
      logo_url: plain.SystemSetting?.logo_url || null,
      images: plain.SystemSetting?.images || [],
      rating,
      total_reviews,
      main_branch_location: mainBranch?.Location || null,
      branches: allBranches.map((b) => ({
        id: b.id,
        name: b.name,
      })),
      menu_categories:
        (mainBranch?.MenuCategories || []).map((cat) => {
          const totalItems = cat.MenuItems.length;
          const offset = (page - 1) * limit;
          const paginatedItems = cat.MenuItems.slice(offset, offset + limit);

          return {
            id: cat.id,
            name: cat.name,
            branch_id: cat.branch_id,
            menu_items: paginatedItems,
            pagination: {
              totalItems,
              totalPages: Math.ceil(totalItems / limit),
              currentPage: page,
              pageSize: limit,
            },
          };
        }) || [],
    };
  },

  async getBranchMenus(restaurantId, branchId, page = 1, limit = 10) {
    const branch = await Branch.findOne({
      where: {
        id: branchId,
        restaurant_id: restaurantId,
      },
      attributes: ["id", "name"],
      include: [
        {
          model: Location,
          attributes: ["address", "latitude", "longitude"],
        },
        {
          model: MenuCategory,
          required: false,
          attributes: ["id", "name", "branch_id"],
          include: [
            {
              model: MenuItem,
              required: false,
              attributes: { exclude: ["createdAt", "updatedAt"] },
            },
          ],
        },
      ],
    });

    if (!branch) throwError("Branch not found", 404);

    const plain = branch.get({ plain: true });

    return {
      branch: {
        id: plain.id,
        name: plain.name,
        location: plain.Location || null,
      },
      menu_categories: (plain.MenuCategories || []).map((cat) => {
        const totalItems = cat.MenuItems.length;
        const offset = (page - 1) * limit;
        const paginatedItems = cat.MenuItems.slice(offset, offset + limit);

        return {
          id: cat.id,
          name: cat.name,
          branch_id: cat.branch_id,
          menu_items: paginatedItems,
          pagination: {
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: page,
            pageSize: limit,
          },
        };
      }),
    };
  },
  // for customer
  async getAllRestaurantsWithCheapestItem({ page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;

    const totalItems = await Restaurant.count({
      where: { status: "active" },
    });

    const restaurants = await Restaurant.findAll({
      where: { status: "active" },
      offset,
      limit,
      attributes: ["id", "restaurant_name"],
      include: [
        {
          model: SystemSetting,
          attributes: ["logo_url", "images"],
          required: false,
        },
        {
          model: Menu,
          attributes: ["id", "name"],
          required: false,
        },
      ],
    });

    const data = await Promise.all(
      restaurants.map(async (restaurant) => {
        const cheapestItem = await MenuItem.findOne({
          include: [
            {
              model: MenuCategory,
              required: true,
              where: { restaurant_id: restaurant.id },
              attributes: { exclude: ["createdAt", "updatedAt"] },
            },
          ],
          order: [["unit_price", "ASC"]],
          attributes: {
            exclude: ["createdAt", "updatedAt"],
          },
        });

        let categoryInfo = null;
        if (cheapestItem?.MenuCategory) {
          categoryInfo = {
            id: cheapestItem.MenuCategory.id,
            name: cheapestItem.MenuCategory.name,
          };
        }

        const restaurantImage = restaurant.SystemSetting?.images?.[0] || null;

        return {
          id: restaurant.id,
          restaurant_name: restaurant.restaurant_name,
          restaurant_logo: restaurant.SystemSetting?.logo_url || null,
          restaurant_image: restaurantImage,
          menu_id: restaurant.Menu?.menu_id || null,
          menu_name: restaurant.Menu?.menu_name || null,
          cheapest_menu_item: cheapestItem
            ? {
                ...cheapestItem.get({ plain: true }),
                category: categoryInfo,
              }
            : null,
        };
      })
    );

    return {
      data,
      meta: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        pageSize: limit,
      },
    };
  },

  // for customer
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
      status: "active",
    };

    if (query) {
      filterCondition.restaurant_name = { [Op.iLike]: `%${query}%` };
    }

    let data = [];
    let totalItems = 0;

    if (nearby === "true" && lat && lng) {
      const replacements = {
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        maxDistance: MAX_NEARBY_DISTANCE_KM,
        limit,
        offset,
      };

      const selectQuery = `
      WITH nearby_restaurants AS (
        SELECT
          r.*,
          l.address,
          l.latitude,
          l.longitude,
          (
            6371 * acos(
              cos(radians(:latitude)) * cos(radians(l.latitude)) *
              cos(radians(l.longitude) - radians(:longitude)) +
              sin(radians(:latitude)) * sin(radians(l.latitude))
            )
          ) AS distance
        FROM restaurants r
        JOIN branches b ON r.id = b.restaurant_id AND b.main_branch = TRUE
        JOIN locations l ON b.location_id = l.id
        WHERE r.status = 'active'
        ${query ? "AND r.restaurant_name ILIKE :query" : ""}
      )
      SELECT *
      FROM nearby_restaurants
      WHERE distance <= :maxDistance
      ORDER BY distance ASC
      LIMIT :limit OFFSET :offset
    `;

      data = await sequelize.query(selectQuery, {
        replacements: {
          ...replacements,
          ...(query ? { query: `%${query}%` } : {}),
        },
        type: QueryTypes.SELECT,
      });

      const countQuery = `
      WITH nearby_restaurants AS (
        SELECT
          r.id,
          (
            6371 * acos(
              cos(radians(:latitude)) * cos(radians(l.latitude)) *
              cos(radians(l.longitude) - radians(:longitude)) +
              sin(radians(:latitude)) * sin(radians(l.latitude))
            )
          ) AS distance
        FROM restaurants r
        JOIN branches b ON r.id = b.restaurant_id AND b.main_branch = TRUE
        JOIN locations l ON b.location_id = l.id
        WHERE r.status = 'active'
        ${query ? "AND r.restaurant_name ILIKE :query" : ""}
      )
      SELECT COUNT(*) FROM nearby_restaurants WHERE distance <= :maxDistance
    `;

      const countResult = await sequelize.query(countQuery, {
        replacements: {
          ...replacements,
          ...(query ? { query: `%${query}%` } : {}),
        },
        type: QueryTypes.SELECT,
      });

      totalItems = parseInt(countResult[0].count);

      const restaurantIds = data.map((r) => r.id);

      if (restaurantIds.length) {
        const menuCategories = await sequelize.models.MenuCategory.findAll({
          where: {
            restaurant_id: restaurantIds,
          },
          attributes: ["name", "restaurant_id"],
          order: [["name", "ASC"]],
        });

        const categoriesByRestaurant = {};
        menuCategories.forEach((cat) => {
          if (!categoriesByRestaurant[cat.restaurant_id]) {
            categoriesByRestaurant[cat.restaurant_id] = [];
          }
          const cleanName = cat.name;
          categoriesByRestaurant[cat.restaurant_id].push({
            id: cat.id,
            name: cleanName,
          });
        });

        data = data.map((restaurant) => {
          const allCategories = categoriesByRestaurant[restaurant.id] || [];

          const seen = new Set();
          const top3 = [];

          for (const cat of allCategories) {
            if (!seen.has(cat.name)) {
              seen.add(cat.name);
              top3.push(cat);
            }
            if (top3.length === 3) break;
          }

          return {
            ...restaurant,
            menu_categories: top3,
          };
        });
      } else {
        data = data.map((restaurant) => ({
          ...restaurant,
          menu_categories: [],
        }));
      }
    } else {
      const allRestaurants = await Restaurant.findAndCountAll({
        where: filterCondition,
        include: [
          {
            model: SystemSetting,
            attributes: ["logo_url", "images"],
            required: false,
          },
          {
            model: ContactInfo,
            as: "owned_contact_info",
            where: { module_type: "restaurant" },
            required: false,
            attributes: ["type", "value", "is_primary"],
          },
          {
            model: Branch,
            as: "mainBranch",
            where: { main_branch: true },
            required: true,
            include: [
              {
                model: Location,
                attributes: ["address", "latitude", "longitude"],
              },
            ],
          },
          {
            model: MenuCategory,
            distinct: true,
            limit: 3,
            attributes: ["name"],
          },
        ],
        offset,
        limit,
        order: [[sort, order]],
      });

      data = allRestaurants.rows.map((restaurant) => {
        const plain = restaurant.get({ plain: true });
        plain.location = plain.mainBranch?.Location || null;
        plain.menu_categories = plain.MenuCategories.map((cat) => ({
          name: cat.name,
        }));
        delete plain.mainBranch;
        delete plain.MenuCategories;
        return plain;
      });

      totalItems = allRestaurants.count;
    }

    return {
      restaurants: data,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        pageSize: limit,
      },
    };
  },

  // for customer
  async getRestaurantProfileWithVideos(
    restaurantId,
    customerId,
    { page = 1, limit = 10, filter = "latest" }
  ) {
    const restaurant = await Restaurant.findByPk(restaurantId, {
      attributes: ["id", "restaurant_name"],
      include: [
        {
          model: SystemSetting,
          attributes: ["logo_url"],
        },
        {
          model: Branch,
          as: "mainBranch",
          required: false,
          where: { main_branch: true },
          attributes: ["id", "name"],
          include: [
            {
              model: Location,
              attributes: ["address", "latitude", "longitude"],
            },
          ],
        },
        {
          model: ContactInfo,
          where: {
            module_type: "restaurant",
            module_id: restaurantId,
          },
          attributes: ["type", "value", "is_primary"],
          required: false,
        },
      ],
    });

    const total_followers = await FollowService.getFollowerCount(restaurantId);
    const is_following = await FollowService.isFollowing(
      customerId,
      restaurantId
    );

    const total_posts = await Video.count({
      where: {
        restaurant_id: restaurantId,
        status: "approved",
      },
    });

    const total_likes_result = await VideoLike.findAll({
      where: { "$Video.restaurant_id$": restaurantId },
      include: [{ model: Video, as: "Video", attributes: [] }],
      attributes: [[fn("COUNT", col("VideoLike.id")), "total_likes"]],
      raw: true,
    });
    const total_likes = parseInt(total_likes_result[0]?.total_likes || 0);

    const offset = (page - 1) * limit;

    const orderOptions = {
      latest: [["created_at", "DESC"]],
      most_viewed: [[literal("total_views"), "DESC"]],
      most_liked: [[literal("total_likes"), "DESC"]],
    };

    const videos = await Video.findAll({
      where: {
        restaurant_id: restaurantId,
        status: "approved",
      },
      attributes: {
        include: [
          [fn("COUNT", literal(`DISTINCT("VideoLikes"."id")`)), "total_likes"],
          [fn("COUNT", literal(`DISTINCT("VideoViews"."id")`)), "total_views"],
        ],
      },
      include: [
        { model: VideoLike, as: "VideoLikes", attributes: [], required: false },
        { model: VideoView, as: "VideoViews", attributes: [], required: false },
      ],
      group: ["Video.id"],
      order: orderOptions[filter] || orderOptions.latest,
      offset,
      limit: parseInt(limit),
      subQuery: false,
    });

    return {
      restaurant: {
        id: restaurant.id,
        name: restaurant.restaurant_name,
        logo_url: restaurant.SystemSetting?.logo_url || null,
        main_branch: restaurant.mainBranch
          ? {
              id: restaurant.mainBranch.id,
              name: restaurant.mainBranch.name,
              location: restaurant.mainBranch.Location
                ? {
                    address: restaurant.mainBranch.Location.address,
                    latitude: restaurant.mainBranch.Location.latitude,
                    longitude: restaurant.mainBranch.Location.longitude,
                  }
                : null,
            }
          : null,
        contacts: (restaurant.ContactInfos || []).map((contact) => ({
          type: contact.type,
          value: contact.value,
          is_primary: contact.is_primary,
        })),
      },
      stats: {
        total_posts,
        total_likes,
        total_followers,
        is_following,
      },
      videos: videos.map((video) => ({
        id: video.id,
        title: video.title,
        video_url: video.video_url,
        thumbnail_url: video.thumbnail_url,
        total_likes: Number(video.getDataValue("total_likes") || 0),
        total_views: Number(video.getDataValue("total_views") || 0),
        created_at: video.created_at,
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
      },
    };
  },
};

module.exports = RestaurantService;
