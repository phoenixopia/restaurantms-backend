const fs = require("fs");
const path = require("path");
const {
  Customer,
  Catering,
  CateringRequest,
  CateringQuote,
  CateringPayment,
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
  // ============ Catering =================

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
        is_active: data.is_active,
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

      let uploadedFile = null;
      if (files) {
        if (Array.isArray(files.image) && files.image.length > 0) {
          uploadedFile = files.image[0];
        } else if (files.filename) {
          uploadedFile = files;
        }
      }

      if (!uploadedFile) {
        throwError("No image uploaded", 400);
      }

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
            path: `${UPLOAD_FOLDER}/${uploadedFile.filename}`,
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

      // cleanup handles both single and multiple
      if (files) {
        const toClean = Array.isArray(files.image)
          ? files.image
          : files.filename
          ? [files]
          : [];
        await cleanupUploadedFiles(toClean);
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

  // ================ Catering Requests ==============

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

  async giveResponseCateringRequest(cateringRequestId, user) {
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

    request.status = "rejected";
    await request.save();

    return {
      id: request.id,
      status: request.status,
      updated_at: request.updated_at,
    };
  },

  async acceptCateringRequestWithQuote(cateringRequestId, user, data) {
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

      // Fetch request with Catering (INNER JOIN so lock works)
      const request = await CateringRequest.findOne({
        where: { id: cateringRequestId },
        include: [
          {
            model: Catering,
            attributes: ["id", "restaurant_id"],
            required: true,
          },
        ],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!request) throwError("Catering request not found", 404);
      if (request.Catering.restaurant_id !== restaurantId) {
        throwError("Not authorized for this request", 403);
      }
      if (request.status !== "pending") {
        throwError("Only pending requests can be accepted", 400);
      }

      // Update request status to approved
      request.status = "approved";
      await request.save({ transaction: t });

      // Check if a quote already exists
      const existingQuote = await CateringQuote.findOne({
        where: { catering_request_id: cateringRequestId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (existingQuote) {
        throwError("A quote has already been prepared for this request", 400);
      }

      // Create quote
      const quote = await CateringQuote.create(
        {
          catering_request_id: request.id,
          catering_id: request.catering_id,
          estimated_price: data.estimated_price,
          description: data.description || null,
          status: "pending",
          payment_status: "Unpaid",
        },
        { transaction: t }
      );

      await t.commit();

      return {
        catering_request: {
          id: request.id,
          status: request.status,
          updated_at: request.updatedAt,
        },
        catering_quote: {
          id: quote.id,
          catering_request_id: quote.catering_request_id,
          catering_id: quote.catering_id,
          estimated_price: quote.estimated_price,
          description: quote.description,
          status: quote.status,
          payment_status: quote.payment_status,
          created_at: quote.createdAt,
        },
      };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },
  // ================ Catering Quote ===============

  async prepareCateringQuote(cateringRequestId, user, data) {
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

      const request = await CateringRequest.findOne({
        where: { id: cateringRequestId },
        include: [{ model: Catering, attributes: ["id", "restaurant_id"] }],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!request) throwError("Catering request not found", 404);

      if (request.Catering.restaurant_id !== restaurantId) {
        throwError("Not authorized to prepare a quote for this request", 403);
      }

      if (request.status !== "approved") {
        throwError(
          "You can only prepare a quote for approved catering requests",
          400
        );
      }

      const existingQuote = await CateringQuote.findOne({
        where: { catering_request_id: cateringRequestId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (existingQuote) {
        throwError("A quote has already been prepared for this request", 400);
      }

      const quote = await CateringQuote.create(
        {
          catering_request_id: request.id,
          catering_id: request.catering_id,
          estimated_price: data.estimated_price,
          description: data.description || null,
          status: "pending",
        },
        { transaction: t }
      );

      await t.commit();

      return {
        id: quote.id,
        catering_request_id: quote.catering_request_id,
        catering_id: quote.catering_id,
        estimated_price: quote.estimated_price,
        description: quote.description,
        status: quote.status,
        created_at: quote.createdAt,
      };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async updateCateringQuote(quoteId, user, updates) {
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

      const quote = await CateringQuote.findOne({
        where: { id: quoteId },
        include: [{ model: Catering, attributes: ["id", "restaurant_id"] }],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!quote) throwError("Catering quote not found", 404);

      if (quote.Catering.restaurant_id !== restaurantId) {
        throwError("Not authorized to update this quote", 403);
      }

      if (quote.status !== "pending") {
        throwError("Only quotes with status 'pending' can be updated", 400);
      }

      if (updates.estimated_price !== undefined) {
        quote.estimated_price = updates.estimated_price;
      }
      if (updates.description !== undefined) {
        quote.description = updates.description;
      }

      await quote.save({ transaction: t });

      await t.commit();

      return {
        id: quote.id,
        catering_request_id: quote.catering_request_id,
        catering_id: quote.catering_id,
        estimated_price: quote.estimated_price,
        description: quote.description,
        status: quote.status,
        updated_at: quote.updatedAt,
      };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async listCateringQuotes(user, { page = 1, limit = 10, status }) {
    let restaurantId;

    if (user.restaurant_id) {
      restaurantId = user.restaurant_id;
    } else if (user.branch_id) {
      const branch = await Branch.findByPk(user.branch_id);
      if (!branch) throwError("Branch not found", 404);
      restaurantId = branch.restaurant_id;
    } else {
      throwError("User does not belong to a restaurant or branch", 403);
    }

    const offset = (page - 1) * limit;

    const whereClause = {};
    if (status) {
      whereClause.status = status;
    }

    const { rows, count } = await CateringQuote.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Catering,
          attributes: ["id", "title", "prepayment_percentage"],
          where: { restaurant_id: restaurantId },
        },
        {
          model: CateringRequest,
          attributes: ["id"],
          include: [
            {
              model: Customer,
              attributes: ["id", "first_name", "last_name"],
            },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });

    return {
      data: rows.map((quote) => ({
        id: quote.id,
        status: quote.status,
        estimated_price: quote.estimated_price,
        created_at: quote.createdAt,
        catering_title: quote.Catering.title,
        prepayment_percentage: quote.Catering.prepayment_percentage,
        customer_name: quote.CateringRequest?.Customer
          ? `${quote.CateringRequest.Customer.first_name} ${quote.CateringRequest.Customer.last_name}`
          : null,
      })),
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / limit),
      },
    };
  },

  async getCateringQuoteById(user, quoteId) {
    let restaurantId;

    if (user.restaurant_id) {
      restaurantId = user.restaurant_id;
    } else if (user.branch_id) {
      const branch = await Branch.findByPk(user.branch_id);
      if (!branch) throwError("Branch not found", 404);
      restaurantId = branch.restaurant_id;
    } else {
      throwError("User does not belong to a restaurant or branch", 403);
    }

    const quote = await CateringQuote.findOne({
      where: { id: quoteId },
      include: [
        {
          model: Catering,
          attributes: ["id", "title", "prepayment_percentage", "restaurant_id"],
        },
        {
          model: CateringRequest,
          attributes: ["id", "status"],
          include: [
            {
              model: Customer,
              attributes: ["id", "first_name", "last_name", "phone", "email"],
            },
          ],
        },
      ],
    });

    if (!quote) throwError("Catering quote not found", 404);

    if (quote.Catering.restaurant_id !== restaurantId) {
      throwError("Not authorized to view this catering quote", 403);
    }

    return {
      id: quote.id,
      status: quote.status,
      estimated_price: quote.estimated_price,
      description: quote.description,
      created_at: quote.createdAt,
      catering: {
        id: quote.Catering.id,
        title: quote.Catering.title,
        prepayment_percentage: quote.Catering.prepayment_percentage,
      },
      request: {
        id: quote.CateringRequest.id,
        status: quote.CateringRequest.status,
        customer: quote.CateringRequest.Customer
          ? {
              id: quote.CateringRequest.Customer.id,
              name: `${quote.CateringRequest.Customer.first_name} ${quote.CateringRequest.Customer.last_name}`,
              phone: quote.CateringRequest.Customer.phone,
              email: quote.CateringRequest.Customer.email,
            }
          : null,
      },
    };
  },
};

module.exports = CateringService;
