"use strict";

const { Op, fn, col, literal, QueryTypes, where } = require("sequelize");
const moment = require("moment-timezone");
const validator = require("validator");
const fs = require("fs");
const path = require("path");
const ReviewService = require("./review_service");
const throwError = require("../../utils/throwError");
const cleanupUploadedFiles = require("../../utils/cleanUploadedFiles");
const { getFileUrl, getFilePath } = require("../../utils/file");

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
  UploadedFile,
  sequelize,
  Video,
} = require("../../models");

const UPLOAD_FOLDER = "restaurant";

function getDateFilterRange(filterType) {
  switch (filterType) {
    case "week":
      return moment().startOf("week").toDate();
    case "month":
      return moment().startOf("month").toDate();
    case "6month":
      return moment().subtract(6, "months").toDate();
    case "year":
      return moment().startOf("year").toDate();
    default:
      return null;
  }
}

const FollowService = require("./follow_service");

const RestaurantService = {
  // ===================
  // this is for the owner of restaurant = restaurant_admin
  async getUserRestaurants(user) {
    let restaurantId = null;

    if (user.restaurant_id) {
      restaurantId = user.restaurant_id;
    } else if (user.branch_id) {
      const branch = await Branch.findByPk(user.branch_id);
      if (!branch) throwError("Branch not found", 404);
      restaurantId = branch.restaurant_id;
    } else {
      throwError("User is not associated with any restaurant or branch", 400);
    }

    const restaurant = await Restaurant.findByPk(restaurantId, {
      include: [
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
          as: "owned_contact_info",
          required: false,
          where: {
            restaurant_id: restaurantId,
            module_type: "restaurant",
            module_id: restaurantId,
          },
          attributes: ["type", "value", "is_primary", "module_id"],
        },
      ],
      attributes: { exclude: ["created_at", "updated_at"] },
    });

    if (!restaurant) throwError("Restaurant not found", 404);

    return restaurant;
  },
  // this for super admin to get all restaurants with their subscription
  async getAllRestaurantsWithSubscriptions({ page, limit, filters }) {
    const offset = (page - 1) * limit;
    const where = {};
    const subscriptionWhere = {};
    const planWhere = {};

    if (filters.search) {
      where.restaurant_name = { [Op.iLike]: `%${filters.search}%` };
    }

    if (filters.status) {
      where.status = filters.status;
    }

    const startDate = getDateFilterRange(filters.createdFilter);
    if (startDate) {
      where.created_at = { [Op.gte]: startDate };
    }

    if (filters.subscriptionStatus) {
      subscriptionWhere.status = filters.subscriptionStatus;
    }

    if (filters.billingCycle) {
      planWhere.billing_cycle = filters.billingCycle;
    }

    const { count, rows } = await Restaurant.findAndCountAll({
      where,
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
          where: Object.keys(subscriptionWhere).length
            ? subscriptionWhere
            : undefined,
          include: [
            {
              model: Plan,
              attributes: ["id", "name", "price", "billing_cycle"],
              where: Object.keys(planWhere).length ? planWhere : undefined,
            },
          ],
          separate: true,
          limit: 1,
          order: [["created_at", "DESC"]],
        },
        {
          model: ContactInfo,
          as: "owned_contact_info",
          required: false,
          where: {
            module_type: "restaurant",
            is_primary: true,
            module_id: { [Op.col]: "Restaurant.id" },
          },
          attributes: ["type", "value", "is_primary", "module_id"],
        },
      ],
      offset,
      limit,
      order: [["created_at", "DESC"]],
      distinct: true,
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
        {
          model: ContactInfo,
          as: "owned_contact_info",
          required: false,
          where: {
            module_type: "restaurant",
            is_primary: true,
            module_id: restaurantId,
          },
          attributes: ["type", "value", "is_primary", "module_id"],
        },
      ],
    });

    if (!restaurant) throwError("Restaurant not found", 404);
    return restaurant;
  },

  // creating restaurant with assigning restaurant admin optionally
  async createRestaurant(body, superAdminId) {
    const transaction = await sequelize.transaction();
    try {
      const { restaurant_name, restaurant_admin_id } = body;

      if (!restaurant_name) {
        throwError("restaurant name required", 400);
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

      await SystemSetting.create(
        {
          restaurant_id: restaurant.id,
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
      throw err;
    }
  },

  async uploadLogoImage(files, user) {
    const t = await sequelize.transaction();

    try {
      // ====== Resolve restaurant_id ======
      let restaurantId = null;
      if (user.restaurant_id) {
        restaurantId = user.restaurant_id;
      } else if (user.branch_id) {
        const branch = await Branch.findByPk(user.branch_id, {
          transaction: t,
        });
        if (!branch) throwError("Branch not found", 404);
        restaurantId = branch.restaurant_id;
      } else {
        throwError("User must belong to a restaurant or branch", 400);
      }

      const restaurant = await Restaurant.findByPk(restaurantId, {
        include: [SystemSetting],
        transaction: t,
      });
      if (!restaurant) throwError("Restaurant not found", 404);

      let systemSetting = restaurant.SystemSetting;
      if (!systemSetting) {
        systemSetting = await SystemSetting.create(
          { restaurant_id: restaurantId },
          { transaction: t }
        );
      }

      const changes = {};

      // ====== Handle Logo Upload ======
      if (files?.logo?.[0]) {
        const logoFile = files.logo[0];
        const relativePath = path.join(UPLOAD_FOLDER, logoFile.filename);

        // Delete old logo (file + UploadedFile row)
        const oldLogo = await UploadedFile.findOne({
          where: {
            restaurant_id: restaurantId,
            type: "logo",
            reference_id: systemSetting.id,
          },
          transaction: t,
        });

        if (oldLogo) {
          await this.deleteOldFile(oldLogo.path);
          await UploadedFile.destroy({
            where: { id: oldLogo.id },
            transaction: t,
          });
        }

        // Insert new UploadedFile row
        await UploadedFile.create(
          {
            restaurant_id: restaurantId,
            path: relativePath,
            size_mb: +(logoFile.size / (1024 * 1024)).toFixed(2),
            uploaded_by: user.id,
            type: "logo",
            reference_id: systemSetting.id,
          },
          { transaction: t }
        );

        const newUrl = getFileUrl(UPLOAD_FOLDER, logoFile.filename);
        changes.logo_url = { before: systemSetting.logo_url, after: newUrl };

        systemSetting.logo_url = newUrl;
        await systemSetting.save({ transaction: t });
      }

      // ====== Handle Restaurant Images Upload ======
      if (files?.images?.length) {
        // Delete all old images (files + UploadedFile rows)
        const oldImages = await UploadedFile.findAll({
          where: {
            restaurant_id: restaurantId,
            type: "restaurant-image",
            reference_id: systemSetting.id,
          },
          transaction: t,
        });

        for (const old of oldImages) {
          await this.deleteOldFile(old.path);
        }

        await UploadedFile.destroy({
          where: {
            restaurant_id: restaurantId,
            type: "restaurant-image",
            reference_id: systemSetting.id,
          },
          transaction: t,
        });

        // Insert new UploadedFile rows
        const newImageUrls = [];
        for (const imgFile of files.images) {
          const relativePath = path.join(UPLOAD_FOLDER, imgFile.filename);

          await UploadedFile.create(
            {
              restaurant_id: restaurantId,
              path: relativePath,
              size_mb: +(imgFile.size / (1024 * 1024)).toFixed(2),
              uploaded_by: user.id,
              type: "restaurant-image",
              reference_id: systemSetting.id,
            },
            { transaction: t }
          );

          newImageUrls.push(getFileUrl(UPLOAD_FOLDER, imgFile.filename));
        }

        changes.images = { before: systemSetting.images, after: newImageUrls };

        systemSetting.images = newImageUrls;
        await systemSetting.save({ transaction: t });
      }

      await t.commit();

      return {
        message: "Restaurant media updated successfully",
        data: await Restaurant.findByPk(restaurantId, {
          include: [SystemSetting],
        }),
      };
    } catch (err) {
      await t.rollback();

      // cleanup uploaded files if failed
      if (files) {
        await cleanupUploadedFiles(
          Object.values(files)
            .flat()
            .map((f) => ({ path: getFilePath(UPLOAD_FOLDER, f.filename) }))
        );
      }

      throw err;
    }
  },

  // Utility for deleting old file safely
  async deleteOldFile(filePath) {
    if (!filePath) return;
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : getFilePath(UPLOAD_FOLDER, path.basename(filePath));

    try {
      await fs.promises.access(fullPath);
      await fs.promises.unlink(fullPath);
    } catch {
      // ignore if file doesn’t exist
    }
  },
  async updateBasicInfo(id, body, user) {
    const transaction = await sequelize.transaction();

    try {
      let restaurant_id = null;

      if (user.restaurant_id) {
        restaurant_id = user.restaurant_id;
      } else if (user.branch_id) {
        const branch = await Branch.findByPk(user.branch_id, { transaction });
        if (!branch) throwError("Branch not found", 404);
        restaurant_id = branch.restaurant_id;
      } else {
        throwError("Access Denied", 403);
      }

      if (!restaurant_id)
        throwError("Unable to determine user's restaurant", 403);

      const restaurant = await Restaurant.findByPk(id, {
        include: [SystemSetting],
        transaction,
      });
      if (!restaurant) throwError("Restaurant not found", 404);

      if (restaurant.id !== restaurant_id)
        throwError(
          "Access denied: You can only update your own restaurant",
          403
        );

      if (body.restaurant_name) {
        const existing = await Restaurant.findOne({
          where: {
            restaurant_name: body.restaurant_name,
            id: { [Op.ne]: id },
          },
          transaction,
        });

        if (existing) {
          throwError("Restaurant name already in use", 400);
        }
      }

      const updates = {};
      const settingUpdates = {};

      if (body.restaurant_name) updates.restaurant_name = body.restaurant_name;
      if (body.primary_color) settingUpdates.primary_color = body.primary_color;
      if (body.language) settingUpdates.default_language = body.language;
      if (typeof body.rtl_enabled === "boolean") {
        settingUpdates.rtl_enabled = body.rtl_enabled;
      }
      if (body.font_family) settingUpdates.font_family = body.font_family;
      if (typeof body.sms_enabled === "boolean") {
        settingUpdates.sms_enabled = body.sms_enabled;
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
            { restaurant_id: restaurant.id, ...settingUpdates },
            { transaction }
          );
        }
      }

      await transaction.commit();
      return await Restaurant.findByPk(id, { include: [SystemSetting] });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async changeRestaurantStatus(id, status) {
    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) throwError("Restaurant not found", 404);

    restaurant.status = status;
    await restaurant.save();
    return restaurant;
  },

  // delete restaurant only for the restaurant admin
  async deleteRestaurant(id) {
    const transaction = await sequelize.transaction();
    try {
      if (!validator.isUUID(id)) throwError("Invalid restaurant ID", 400);

      const restaurant = await Restaurant.findByPk(id, {
        include: [SystemSetting],
        transaction,
      });
      if (!restaurant) throwError("Restaurant not found", 404);

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
          as: "owned_contact_info",
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
