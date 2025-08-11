"use strict";

const { Op, fn, col, literal, QueryTypes, where } = require("sequelize");
const moment = require("moment-timezone");
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

const UPLOADS_DIR = path.resolve(__dirname, "../../../uploads/restaurant");
const SERVER_URL = process.env.SERVER_URL || "http://127.0.0.1:8000";
const MAX_NEARBY_DISTANCE_KM = 5;

const getFileUrl = (filename) => {
  if (!filename) return null;
  const encodedFilename = encodeURIComponent(filename);
  return `${SERVER_URL}/uploads/${encodedFilename}`;
};

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

const getFilePath = (filename) => path.join(UPLOADS_DIR, filename);

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

  async addContactInfo(user, data) {
    const { module_type, module_id, type, value, is_primary = false } = data;
    let restaurant_id = null;

    if (user.restaurant_id) {
      restaurant_id = user.restaurant_id;
    } else if (user.branch_id) {
      const branch = await Branch.findByPk(user.branch_id);
      if (!branch) throwError("Branch not found", 404);
      restaurant_id = branch.restaurant_id;
    } else {
      throwError("User does not belong to a restaurant or branch");
    }

    if (is_primary) {
      const existingPrimary = await ContactInfo.findOne({
        where: {
          restaurant_id,
          module_type,
          module_id,
          is_primary: true,
        },
      });

      if (existingPrimary) {
        throw new Error(
          `There is already a primary contact for this ${module_type}. Only one primary contact is allowed.`
        );
      }
    }

    const contactInfo = await ContactInfo.create({
      restaurant_id,
      module_type,
      module_id,
      type,
      value,
      is_primary,
    });

    return contactInfo;
  },

  async getAllContactInfo(user, filters) {
    const { module_type, search_value, page, limit } = filters;
    const offset = (page - 1) * limit;

    let where = {};

    if (user.restaurant_id) {
      where.restaurant_id = user.restaurant_id;

      if (module_type) {
        where.module_type = module_type;
      }
      if (search_value) {
        where.value = {
          [Op.iLike]: `%${search_value}%`,
        };
      }
    } else if (user.branch_id) {
      where = {
        module_type: "branch",
        module_id: user.branch_id,
      };
    } else {
      throwError("User does not belong to a restaurant or branch", 404);
    }

    const { count, rows } = await ContactInfo.findAndCountAll({
      where,
      order: [["created_at", "DESC"]],
      offset,
      limit,
      include: [
        {
          model: Restaurant,
          attributes: ["id", "restaurant_name"],
          required: false,
          where: { id: sequelize.col("ContactInfo.module_id") },
        },
        {
          model: Branch,
          attributes: ["id", "name"],
          required: false,
          where: { id: sequelize.col("ContactInfo.module_id") },
        },
      ],
    });

    return {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      data: rows,
    };
  },

  async getContactInfoById(user, id) {
    const contactInfo = await ContactInfo.findByPk(id, {
      include: [
        {
          model: Restaurant,
          attributes: ["id", "restaurant_name"],
          required: false,
          where: sequelize.literal(
            `"ContactInfo"."module_type" = 'restaurant' AND "ContactInfo"."module_id" = "restaurant"."id"`
          ),
        },
        {
          model: Branch,
          attributes: ["id", "name", "restaurant_id"],
          required: false,
          where: sequelize.literal(
            `"ContactInfo"."module_type" = 'branch' AND "ContactInfo"."module_id" = "branch"."id"`
          ),
        },
      ],
    });

    if (!contactInfo) {
      throwError("Contact info not found", 404);
    }

    let restaurant_id = null;

    if (user.restaurant_id) {
      restaurant_id = user.restaurant_id;
    } else if (user.branch_id) {
      if (!contactInfo.Branch) {
        throwError("Branch info not found", 404);
      }
      restaurant_id = contactInfo.Branch.restaurant_id;
    } else {
      throwError("User does not belong to a restaurant or branch", 403);
    }

    if (contactInfo.restaurant_id !== restaurant_id) {
      throwError("Not authorized to access this contact info", 403);
    }

    if (user.branch_id) {
      if (
        contactInfo.module_type !== "branch" ||
        contactInfo.module_id !== user.branch_id
      ) {
        throwError("Not authorized to access this contact info", 403);
      }
    }

    return contactInfo;
  },

  async updateContactInfo(user, id, data) {
    const transaction = await sequelize.transaction();
    try {
      const contactInfo = await ContactInfo.findByPk(id, { transaction });
      if (!contactInfo) {
        throwError("Contact info not found", 404);
      }

      let restaurant_id = null;

      if (user.restaurant_id) {
        restaurant_id = user.restaurant_id;
      } else if (user.branch_id) {
        const branch = await Branch.findByPk(user.branch_id, { transaction });
        if (!branch) {
          throwError("Branch not found", 404);
        }
        restaurant_id = branch.restaurant_id;
      } else {
        throwError("User does not belong to a restaurant or branch", 403);
      }

      if (contactInfo.restaurant_id !== restaurant_id) {
        throwError("Not authorized to update this contact info", 403);
      }

      if (user.branch_id) {
        if (
          contactInfo.module_type !== "branch" ||
          contactInfo.module_id !== user.branch_id
        ) {
          throwError("Not authorized to update this contact info", 403);
        }
      }

      if (data.is_primary === true && !contactInfo.is_primary) {
        const existingPrimary = await ContactInfo.findOne({
          where: {
            restaurant_id,
            module_type: contactInfo.module_type,
            module_id: contactInfo.module_id,
            is_primary: true,
            id: { [Op.ne]: id },
          },
          transaction,
        });

        if (existingPrimary) {
          throwError(
            `There is already a primary contact for this ${contactInfo.module_type}. Only one primary contact is allowed.`,
            400
          );
        }
      }

      const allowedFields = ["type", "value", "is_primary"];
      allowedFields.forEach((field) => {
        if (data[field] !== undefined) {
          contactInfo[field] = data[field];
        }
      });

      await contactInfo.save({ transaction });

      await transaction.commit();
      return contactInfo;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async deleteContactInfo(user, id) {
    const transaction = await sequelize.transaction();
    try {
      const contactInfo = await ContactInfo.findByPk(id, {
        include: [
          {
            model: Branch,
            attributes: ["id", "restaurant_id"],
            required: false,
            where: sequelize.literal(
              `"ContactInfo"."module_type" = 'branch' AND "ContactInfo"."module_id" = "branch"."id"`
            ),
          },
        ],
        transaction,
      });

      if (!contactInfo) {
        throwError("Contact info not found", 404);
      }

      let restaurant_id = null;

      if (user.restaurant_id) {
        restaurant_id = user.restaurant_id;
      } else if (user.branch_id) {
        if (!contactInfo.Branch) {
          throwError("Branch info not found", 404);
        }
        restaurant_id = contactInfo.Branch.restaurant_id;
      } else {
        throwError("User does not belong to a restaurant or branch", 403);
      }

      if (contactInfo.restaurant_id !== restaurant_id) {
        throwError("Not authorized to delete this contact info", 403);
      }

      if (user.branch_id) {
        if (
          contactInfo.module_type !== "branch" ||
          contactInfo.module_id !== user.branch_id
        ) {
          throwError("Not authorized to delete this contact info", 403);
        }
      }

      await contactInfo.destroy({ transaction });

      await transaction.commit();
      return { message: "Contact info deleted successfully" };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async setPrimaryContactInfo(user, contactInfoId) {
    const transaction = await sequelize.transaction();
    try {
      const contactInfo = await ContactInfo.findByPk(contactInfoId, {
        include: [
          {
            model: Branch,
            attributes: ["id", "restaurant_id"],
            required: false,
            where: sequelize.literal(
              `"ContactInfo"."module_type" = 'branch' AND "ContactInfo"."module_id" = "branch"."id"`
            ),
          },
        ],
        transaction,
      });

      if (!contactInfo) {
        throwError("Contact info not found", 404);
      }

      let restaurant_id = null;
      if (user.restaurant_id) {
        restaurant_id = user.restaurant_id;
      } else if (user.branch_id) {
        if (!contactInfo.Branch) {
          throwError("Branch info not found", 404);
        }
        restaurant_id = contactInfo.Branch.restaurant_id;
      } else {
        throwError("User does not belong to a restaurant or branch", 403);
      }

      if (contactInfo.restaurant_id !== restaurant_id) {
        throwError("Not authorized to update this contact info", 403);
      }

      if (user.branch_id) {
        if (
          contactInfo.module_type !== "branch" ||
          contactInfo.module_id !== user.branch_id
        ) {
          throwError("Not authorized to update this contact info", 403);
        }
      }

      const existingPrimary = await ContactInfo.findOne({
        where: {
          restaurant_id,
          module_type: contactInfo.module_type,
          module_id: contactInfo.module_id,
          is_primary: true,
          id: { [Op.ne]: contactInfoId },
        },
        transaction,
      });

      if (existingPrimary) {
        existingPrimary.is_primary = false;
        await existingPrimary.save({ transaction });
      }

      contactInfo.is_primary = true;
      await contactInfo.save({ transaction });

      await transaction.commit();
      return contactInfo;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
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

  async getBranchMenus(
    restaurantId,
    branchId,
    page = 1,
    limit = 10,
    categoryName = ""
  ) {
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
      ],
    });
    if (!branch) {
      throwError("Branch not found", 404);
    }

    if (categoryName) {
      const category = await MenuCategory.findOne({
        where: { name: categoryName, branch_id: branchId },
        attributes: ["id", "name", "branch_id"],
      });

      if (!category) {
        return {
          menu_items: [],
          pagination: {
            totalItems: 0,
            totalPages: 0,
            currentPage: 1,
            pageSize: limit,
          },
        };
      }

      const totalItems = await MenuItem.count({
        where: { menu_category_id: category.id },
      });

      const items = await MenuItem.findAll({
        where: { menu_category_id: category.id },
        attributes: { exclude: ["createdAt", "updatedAt"] },
        limit: limit,
        offset: (page - 1) * limit,
        order: [["created_at", "ASC"]],
      });

      return {
        menu_items: items,
        pagination: {
          totalItems,
          totalPages: Math.ceil(totalItems / limit),
          currentPage: page,
          pageSize: limit,
        },
      };
    } else {
      const allCategories = await MenuCategory.findAll({
        where: { branch_id: branchId },
        attributes: ["id", "name"],
        order: [["id", "ASC"]],
      });

      const menuCategories = await Promise.all(
        allCategories.map(async (cat) => {
          const totalItems = await MenuItem.count({
            where: { menu_category_id: cat.id },
          });

          const items = await MenuItem.findAll({
            where: { menu_category_id: cat.id },
            attributes: { exclude: ["createdAt", "updatedAt"] },
            limit: limit,
            offset: (page - 1) * limit,
            order: [["created_at", "ASC"]],
          });

          return {
            id: cat.id,
            name: cat.name,
            branch_id: cat.branch_id,
            menu_items: items,
            pagination: {
              totalItems,
              totalPages: Math.ceil(totalItems / limit),
              currentPage: page,
              pageSize: limit,
            },
          };
        })
      );

      return {
        branch: {
          id: branch.id,
          name: branch.name,
          location: branch.Location || null,
        },
        menu_categories: menuCategories,
      };
    }
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
          menu_name: restaurant.Menu?.name || null,
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
    filter,
  }) {
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

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

      const baseCondition = query ? "AND r.restaurant_name ILIKE :query" : "";

      const selectQuery = `
      WITH nearby_restaurants AS (
        SELECT
          r.*,
          ss.logo_url,
          ss.images,
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
        LEFT JOIN system_settings ss ON ss.restaurant_id = r.id
        JOIN branches b ON r.id = b.restaurant_id AND b.main_branch = TRUE
        JOIN locations l ON b.location_id = l.id
        WHERE r.status = 'active'
        ${baseCondition}
      )
      SELECT *
      FROM nearby_restaurants
      WHERE distance <= :maxDistance
      ORDER BY distance ASC
      LIMIT :limit OFFSET :offset
    `;

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
        ${baseCondition}
      )
      SELECT COUNT(*) FROM nearby_restaurants WHERE distance <= :maxDistance
    `;

      const replacementsWithQuery = {
        ...replacements,
        ...(query ? { query: `%${query}%` } : {}),
      };

      const rawRestaurants = await sequelize.query(selectQuery, {
        replacements: replacementsWithQuery,
        type: QueryTypes.SELECT,
      });

      const countResult = await sequelize.query(countQuery, {
        replacements: replacementsWithQuery,
        type: QueryTypes.SELECT,
      });

      totalItems = parseInt(countResult[0].count);

      const restaurantIds = rawRestaurants.map((r) => r.id);

      const menuCategories = await sequelize.models.MenuCategory.findAll({
        where: {
          restaurant_id: restaurantIds,
        },
        attributes: ["id", "name", "restaurant_id"],
        order: [["name", "ASC"]],
      });

      const categoriesByRestaurant = {};
      menuCategories.forEach((cat) => {
        if (!categoriesByRestaurant[cat.restaurant_id]) {
          categoriesByRestaurant[cat.restaurant_id] = [];
        }
        if (
          !categoriesByRestaurant[cat.restaurant_id].some(
            (c) => c.name === cat.name
          )
        ) {
          categoriesByRestaurant[cat.restaurant_id].push({
            id: cat.id,
            name: cat.name,
          });
        }
      });

      data = await Promise.all(
        rawRestaurants.map(async (r) => {
          const categories = categoriesByRestaurant[r.id] || [];

          const { rating, total_reviews } =
            await ReviewService.calculateRestaurantRating(r.id);

          return {
            id: r.id,
            restaurant_name: r.restaurant_name,
            location: {
              address: r.address,
              latitude: r.latitude,
              longitude: r.longitude,
            },
            menu_categories: categories.slice(0, 3),
            rating,
            total_reviews,
            logo_url: r.logo_url || null,
            images: r.images || [],
          };
        })
      );

      if (filter === "top_rated") {
        data.sort((a, b) => b.rating - a.rating);
      }
    } else {
      const { rows, count } = await Restaurant.findAndCountAll({
        where: {
          status: "active",
          ...(query
            ? {
                restaurant_name: {
                  [Op.iLike]: `%${query}%`,
                },
              }
            : {}),
        },
        offset,
        limit,
        order: [[sort, order]],
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
            attributes: ["id", "name"],
          },
        ],
      });

      totalItems = count;

      data = await Promise.all(
        rows.map(async (r) => {
          const plain = r.get({ plain: true });

          const { rating, total_reviews } =
            await ReviewService.calculateRestaurantRating(plain.id);

          return {
            id: plain.id,
            restaurant_name: plain.restaurant_name,
            logo_url: plain.SystemSetting?.logo_url || null,
            images: plain.SystemSetting?.images || [],
            location: plain.mainBranch?.Location || null,
            menu_categories: (plain.MenuCategories || []).map((cat) => ({
              id: cat.id,
              name: cat.name,
            })),
            rating,
            total_reviews,
          };
        })
      );

      if (filter === "top_rated") {
        data.sort((a, b) => b.rating - a.rating);
      }
    }

    const totalPages = Math.ceil(totalItems / limit);

    return {
      restaurants: data,
      pagination: {
        totalItems,
        totalPages,
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
