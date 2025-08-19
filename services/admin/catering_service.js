const fs = require("fs");
const path = require("path");
const {
  Catering,
  CateringRequest,
  Restaurant,
  Branch,
  Location,
  UploadedFile,
  SystemSetting,
  sequelize,
} = require("../../models");
const throwError = require("../../utils/throwError");
const cleanupUploadedFiles = require("../../utils/cleanUploadedFiles");
const { getFileUrl, getFilePath } = require("../../utils/file");

const UPLOAD_FOLDER = "catering-card";
const CateringService = {
  async createCatering(user, data) {
    const t = await sequelize.transaction();
    try {
      let restaurantId;

      if (user.restaurant_id) {
        const restaurant = await Restaurant.findByPk(user.restaurant_id, {
          transaction: t,
        });
        if (!restaurant) {
          throwError("Restaurant not found", 404);
        }
        restaurantId = restaurant.id;
      } else if (user.branch_id) {
        const branch = await Branch.findByPk(user.branch_id, {
          transaction: t,
        });
        if (!branch) {
          throwError("Branch not found", 404);
        }

        const restaurant = await Restaurant.findByPk(branch.restaurant_id, {
          transaction: t,
        });
        if (!restaurant) {
          throwError("Restaurant not found", 404);
        }
        restaurantId = restaurant.id;
      } else {
        throwError("User is not associated with a restaurant or branch", 400);
      }

      const catering = await Catering.create(
        {
          restaurant_id: restaurantId,
          title: data.title,
          description: data.description,
          menu_summary: data.menu_summary,
          base_price: data.base_price,
          min_guest_count: data.min_guest_count,
          max_guest_count: data.max_guest_count,
          min_advance_days: data.min_advance_days,
          prepayment_percentage: data.prepayment_percentage,
          include_service: data.include_service || false,
          delivery_available: data.delivery_available || false,
          service_area_description: data.service_area_description || null,
          contact_person: data.contact_person,
          contact_info: data.contact_info || null,
          is_active: true,
        },
        {
          transaction: t,
        }
      );

      await t.commit();
      return catering;
    } catch (error) {}
  },

  async updateBasicInfo(cateringId, user, data) {
    const t = await sequelize.transaction();
    try {
      let restaurantId;

      if (user.restaurant_id) {
        const restaurant = await Restaurant.findByPk(user.restaurant_id, {
          transaction: t,
        });
        if (!restaurant) throwError("Restaurant not found", 404);
        restaurantId = restaurant.id;
      } else if (user.branch_id) {
        const branch = await Branch.findByPk(user.branch_id, {
          transaction: t,
        });
        if (!branch) throwError("Branch not found", 404);

        const restaurant = await Restaurant.findByPk(branch.restaurant_id, {
          transaction: t,
        });
        if (!restaurant) throwError("Restaurant not found", 404);
        restaurantId = restaurant.id;
      } else {
        throwError("User is not associated with a restaurant or branch", 400);
      }

      const catering = await Catering.findByPk(cateringId, { transaction: t });
      if (!catering) throwError("Catering not found", 404);
      if (catering.restaurant_id !== restaurantId) {
        throwError("Not authorized to update this catering", 403);
      }

      const updatableFields = {
        title: data.title,
        description: data.description,
        menu_summary: data.menu_summary,
        base_price: data.base_price,
        min_guest_count: data.min_guest_count,
        max_guest_count: data.max_guest_count,
        min_advance_days: data.min_advance_days,
        prepayment_percentage: data.prepayment_percentage,
        include_service: data.include_service,
        delivery_available: data.delivery_available,
        service_area_description: data.service_area_description,
        contact_person: data.contact_person,
        contact_info: data.contact_info,
      };

      await catering.update(updatableFields, { transaction: t });

      await t.commit();
      return catering;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async uploadImage(cateringId, files, user) {
    const t = await sequelize.transaction();
    try {
      let restaurantId;

      if (user.restaurant_id) {
        restaurantId = user.restaurant_id;
      } else if (user.branch_id) {
        const branch = await Branch.findByPk(user.branch_id, {
          transaction: t,
        });
        if (!branch) throwError("Branch not found", 404);
        restaurantId = branch.restaurant_id;
      } else {
        throwError("User does not belong to a restaurant or branch", 404);
      }

      const catering = await Catering.findByPk(cateringId, { transaction: t });
      if (!catering) throwError("Catering not found", 404);

      if (catering.restaurant_id !== restaurantId) {
        throwError("Not authorized to update this catering", 403);
      }

      if (!files || !files.image || !files.image[0]) {
        throwError("No image uploaded", 400);
      }

      const uploadedFile = files.image[0];
      const fileUrl = getFileUrl(UPLOAD_FOLDER, uploadedFile.filename);

      let existingFile = await UploadedFile.findOne({
        where: {
          restaurant_id: restaurantId,
          type: "catering-card",
          reference_id: catering.id,
        },
        transaction: t,
      });

      if (existingFile) {
        const oldFilename = path.basename(existingFile.path);
        const oldPath = getFilePath(UPLOAD_FOLDER, oldFilename);
        if (fs.existsSync(oldPath)) {
          await fs.promises.unlink(oldPath).catch(() => {});
        }

        existingFile.path = fileUrl;
        existingFile.size_mb = uploadedFile.size / (1024 * 1024);
        existingFile.uploaded_by = user.id;
        await existingFile.save({ transaction: t });
      } else {
        await UploadedFile.create(
          {
            restaurant_id: restaurantId,
            path: fileUrl,
            size_mb: uploadedFile.size / (1024 * 1024),
            uploaded_by: user.id,
            type: "catering-card",
            reference_id: catering.id,
          },
          { transaction: t }
        );
      }

      catering.cover_image_url = fileUrl;
      await catering.save({ transaction: t });

      await t.commit();
      return catering;
    } catch (err) {
      await t.rollback();
      if (files) {
        await cleanupUploadedFiles(files);
      }
      throw err;
    }
  },

  async deleteCatering(cateringId, user) {
    const t = await sequelize.transaction();
    try {
      let restaurantId;

      if (user.restaurant_id) {
        restaurantId = user.restaurant_id;
      } else if (user.branch_id) {
        const branch = await Branch.findByPk(user.branch_id, {
          transaction: t,
        });
        if (!branch) throwError("Branch not found", 404);
        restaurantId = branch.restaurant_id;
      } else {
        throwError("User does not belong to a restaurant or branch", 404);
      }

      const catering = await Catering.findByPk(cateringId, { transaction: t });
      if (!catering) throwError("Catering not found", 404);

      if (catering.restaurant_id !== restaurantId) {
        throwError("Not authorized to delete this catering", 403);
      }

      const uploadedFile = await UploadedFile.findOne({
        where: {
          restaurant_id: restaurantId,
          type: "catering-card",
          reference_id: catering.id,
        },
        transaction: t,
      });

      if (uploadedFile) {
        const oldFilename = path.basename(uploadedFile.path);
        const oldPath = getFilePath(UPLOAD_FOLDER, oldFilename);
        if (fs.existsSync(oldPath)) {
          await fs.promises.unlink(oldPath).catch(() => {});
        }

        await uploadedFile.destroy({ transaction: t });
      }

      await catering.destroy({ transaction: t });

      await t.commit();
      return { message: "Catering deleted successfully" };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async getAllCateringSerivce(user, { page = 1, limit = 10 }) {
    let restaurantId;

    if (user.restaurant_id) {
      restaurantId = user.restaurant_id;
    } else if (user.branch_id) {
      const branch = await Branch.findByPk(user.branch_id);
      if (!branch) throwError("Branch not found", 404);
      restaurantId = branch.restaurant_id;
    } else {
      throwError("User does not belong to a restaurant or branch", 404);
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await Catering.findAndCountAll({
      where: { restaurant_id: restaurantId },
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });

    return {
      total: count,
      page,
      pageSize: limit,
      totalPages: Math.ceil(count / limit),
      data: rows,
    };
  },

  async getCateringServiceById(user, cateringId) {
    let restaurantId;

    if (user.restaurant_id) {
      restaurantId = user.restaurant_id;
    } else if (user.branch_id) {
      const branch = await Branch.findByPk(user.branch_id);
      if (!branch) throwError("Branch not found", 404);
      restaurantId = branch.restaurant_id;
    } else {
      throwError("User does not belong to a restaurant or branch", 404);
    }

    const catering = await Catering.findByPk(cateringId);
    if (!catering) throwError("Catering not found", 404);

    if (catering.restaurant_id !== restaurantId) {
      throwError("Not authorized to view this catering", 403);
    }

    return catering;
  },

  async toggleStatus(user, cateringId) {
    let restaurantId;

    if (user.restaurant_id) {
      restaurantId = user.restaurant_id;
    } else if (user.branch_id) {
      const branch = await Branch.findByPk(user.branch_id);
      if (!branch) throwError("Branch not found", 404);
      restaurantId = branch.restaurant_id;
    } else {
      throwError("User does not belong to a restaurant or branch", 404);
    }

    const catering = await Catering.findByPk(cateringId);
    if (!catering) throwError("Catering not found", 404);

    if (catering.restaurant_id !== restaurantId) {
      throwError("Not authorized to update this catering", 403);
    }

    catering.is_active = !catering.is_active;
    await catering.save();

    return catering;
  },

  async getCateringById(id) {
    const catering = await Catering.findByPk(id);
    if (!catering) throwError("Catering not found", 404);

    const restaurant_id = catering.restaurant_id;

    const restaurant = await Restaurant.findByPk(restaurant_id, {
      attributes: ["id", "restaurant_name"],
    });

    const setting = await SystemSetting.findOne({
      where: { restaurant_id },
      attributes: ["logo_url"],
    });

    const mainBranch = await Branch.findOne({
      where: { restaurant_id, main_branch: true },
      include: [
        {
          model: Location,
          attributes: ["address", "latitude", "longitude"],
        },
      ],
    });

    return {
      ...catering.toJSON(),
      restaurant: {
        id: restaurant_id,
        name: restaurant?.restaurant_name || null,
        logo_url: setting?.logo_url || null,
        main_branch_location: mainBranch?.Location?.toJSON() || null,
      },
    };
  },
  async listCaterings(restaurant_id, page = 1, limit = 10) {
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const { count, rows } = await Catering.findAndCountAll({
      where: { restaurant_id },
      limit,
      offset,
      order: [["created_at", "DESC"]],
    });

    const setting = await SystemSetting.findOne({
      where: { restaurant_id },
      attributes: ["logo_url"],
    });

    const mainBranch = await Branch.findOne({
      where: { restaurant_id, main_branch: true },
      include: [
        {
          model: Location,
          attributes: ["address", "latitude", "longitude"],
        },
      ],
    });

    const enrichedCaterings = rows.map((catering) => {
      return {
        ...catering.toJSON(),
        restaurant: {
          id: restaurant_id,
          logo_url: setting?.logo_url || null,
          main_branch_location: mainBranch?.Location?.toJSON() || null,
        },
      };
    });

    return {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      caterings: enrichedCaterings,
    };
  },

  // ================ Catering requests

  async getCateringRequests(user, { page = 1, limit = 10, status }) {
    let restaurantId;

    if (user.restaurant_id) {
      restaurantId = user.restaurant_id;
    } else if (user.branch_id) {
      const branch = await Branch.findByPk(user.branch_id);
      if (!branch) throwError("Branch not found", 404);
      restaurantId = branch.restaurant_id;
    } else {
      throwError("User does not belong to a restaurant or branch", 404);
    }

    const offset = (page - 1) * limit;

    const whereClause = {};
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      whereClause.status = status;
    }

    const { count, rows } = await CateringRequest.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Catering,
          attributes: ["id", "title", "delivery_available"],
          where: { restaurant_id: restaurantId },
        },
        {
          model: Customer,
          attributes: ["id", "first_name", "last_name"],
        },
        {
          model: Location,
          attributes: ["id", "address"],
          required: false,
        },
      ],
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });

    const data = rows.map((req) => {
      const location = req.Catering.delivery_available ? req.Location : null;
      return {
        id: req.id,
        event_type: req.event_type,
        guest_count: req.guest_count,
        event_date: req.event_date,
        notes: req.notes,
        status: req.status,
        customer: req.Customer
          ? {
              id: req.Customer.id,
              name: `${req.Customer.first_name} ${req.Customer.last_name}`,
            }
          : null,
        catering: req.Catering
          ? { id: req.Catering.id, title: req.Catering.title }
          : null,
        location: location
          ? { id: location.id, address: location.address }
          : null,
        created_at: req.created_at,
      };
    });

    return {
      total: count,
      page,
      pageSize: limit,
      totalPages: Math.ceil(count / limit),
      data,
    };
  },

  async getCateringRequestById(cateringRequestId, user) {
    let restaurantId;

    if (user.restaurant_id) {
      restaurantId = user.restaurant_id;
    } else if (user.branch_id) {
      const branch = await Branch.findByPk(user.branch_id);
      if (!branch) throwError("Branch not found", 404);
      restaurantId = branch.restaurant_id;
    } else {
      throwError("User does not belong to a restaurant or branch", 404);
    }

    const request = await CateringRequest.findOne({
      where: { id: cateringRequestId },
      include: [
        {
          model: Catering,
          attributes: ["id", "title", "delivery_available", "restaurant_id"],
        },
        {
          model: Customer,
          attributes: ["id", "first_name", "last_name"],
        },
        {
          model: Location,
          attributes: ["id", "address"],
          required: false,
        },
      ],
    });

    if (!request) {
      throwError("Catering request not found", 404);
    }

    if (request.Catering.restaurant_id !== restaurantId) {
      throwError("Not authorized to view this catering request", 403);
    }

    const location = request.Catering.delivery_available
      ? request.Location
      : null;

    return {
      id: request.id,
      event_type: request.event_type,
      guest_count: request.guest_count,
      event_date: request.event_date,
      notes: request.notes,
      status: request.status,
      customer: request.Customer
        ? {
            id: request.Customer.id,
            name: `${request.Customer.first_name} ${request.Customer.last_name}`,
          }
        : null,
      catering: request.Catering
        ? { id: request.Catering.id, title: request.Catering.title }
        : null,
      location: location
        ? { id: location.id, address: location.address }
        : null,
      created_at: request.created_at,
    };
  },

  async giveResponseCateringRequest(cateringRequestId, user, data) {
    let restaurantId;

    if (user.restaurant_id) {
      restaurantId = user.restaurant_id;
    } else if (user.branch_id) {
      const branch = await Branch.findByPk(user.branch_id);
      if (!branch) throwError("Branch not found", 404);
      restaurantId = branch.restaurant_id;
    } else {
      throwError("User does not belong to a restaurant or branch", 404);
    }

    const request = await CateringRequest.findOne({
      where: { id: cateringRequestId },
      include: [
        {
          model: Catering,
          attributes: ["id", "restaurant_id"],
        },
      ],
    });

    if (!request) {
      throwError("Catering request not found", 404);
    }

    if (request.Catering.restaurant_id !== restaurantId) {
      throwError("Not authorized to respond to this catering request", 403);
    }

    if (!["approved", "rejected"].includes(data.status)) {
      throwError(
        "Invalid status. Only 'approved' or 'rejected' are allowed.",
        400
      );
    }

    request.status = data.status;
    await request.save();

    return {
      id: request.id,
      status: request.status,
      updated_at: request.updated_at,
    };
  },

  async listOneCateringPerRestaurant({ page = 1, limit = 10 }) {
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const [results] = await sequelize.query(`
    SELECT DISTINCT ON (restaurant_id) *
    FROM "caterings"
    ORDER BY restaurant_id, created_at DESC
  `);

    const totalItems = results.length;
    const paginated = results.slice(offset, offset + limit);

    const enriched = await Promise.all(
      paginated.map(async (catering) => {
        const setting = await SystemSetting.findOne({
          where: { restaurant_id: catering.restaurant_id },
          attributes: ["logo_url"],
        });

        const mainBranch = await Branch.findOne({
          where: { restaurant_id: catering.restaurant_id, main_branch: true },
          include: [
            {
              model: Location,
              attributes: ["address", "latitude", "longitude"],
            },
          ],
        });

        return {
          ...catering,
          restaurant: {
            id: catering.restaurant_id,
            logo_url: setting?.logo_url || null,
            main_branch_location: mainBranch?.Location?.toJSON() || null,
          },
        };
      })
    );

    return {
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page,
      caterings: enriched,
    };
  },

  async createCateringRequest({ customerId, data }) {
    const {
      catering_id,
      event_type,
      guest_count,
      delivery_location,
      event_date,
      notes,
    } = data;
    const catering = await Catering.findByPk(catering_id);
    if (!catering) throwError("Catering not found", 404);

    if (delivery_location && !catering.delivery_available) {
      throwError("This catering service does not support delivery", 400);
    }

    if (guest_count !== null && guest_count !== undefined) {
      if (guest_count < catering.min_guest_count) {
        throwError(
          `Guest count is below the minimum required (${catering.min_guest_count})`,
          400
        );
      }

      if (guest_count > catering.max_guest_count) {
        throwError(
          `Guest count exceeds the maximum allowed (${catering.max_guest_count})`,
          400
        );
      }
    }

    const request = await CateringRequest.create({
      catering_id,
      customer_id: customerId,
      event_type,
      guest_count,
      delivery_location: delivery_location || null,
      event_date,
      notes,
    });

    return request;
  },

  async respondToCateringRequest(
    requestId,
    userId,
    role,
    restaurant_id,
    branch_id,
    status
  ) {
    const allowedStatuses = ["approved", "rejected"];
    if (!allowedStatuses.includes(status)) {
      throwError(
        "Invalid status. Must be either 'approved' or 'rejected'",
        400
      );
    }

    const request = await CateringRequest.findByPk(requestId);
    if (!request) throwError("Catering request not found", 404);

    const catering = await Catering.findByPk(request.catering_id);
    if (!catering) throwError("Associated catering not found", 404);

    let allowedRestaurantId = null;

    if (role === "restaurant_admin") {
      allowedRestaurantId = restaurant_id;
    } else if (role === "staff" && branch_id) {
      const branch = await Branch.findByPk(branch_id);
      if (!branch) throwError("Branch not found", 404);
      allowedRestaurantId = branch.restaurant_id;
    } else {
      throwError("Unauthorized role to respond to catering requests", 403);
    }

    if (catering.restaurant_id !== allowedRestaurantId) {
      throwError("Access denied: You cannot manage this catering request", 403);
    }

    request.status = status;
    await request.save();

    return request;
  },
};

module.exports = CateringService;
