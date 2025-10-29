const {
  Customer,
  Catering,
  CateringRequest,
  CateringQuote,
  CateringPayment,
  Restaurant,
  RestaurantUser,
  Branch,
  Location,
  SystemSetting,
  sequelize,
  UploadedFile,
} = require("../../models");
const throwError = require("../../utils/throwError");
const { sendNotificationEmail } = require("../../utils/sendEmail");
const { buildPagination } = require("../../utils/pagination");
const SendNotification = require("../../utils/send_notification");

const CateringService = {
  // delete caterings for customer
  async deleteCateringRequest(cateringRequestId, customerId) {
    const t = await sequelize.transaction();

    try {
      // Find the catering request with related data
      const cateringRequest = await CateringRequest.findOne({
        where: { id: cateringRequestId , customer_id: customerId},
        include: [{
          model: CateringQuote,
          include: [CateringPayment]
        }],
        transaction: t
      });

      if (!cateringRequest) {
        throwError('Catering request not found', 404);
      }

       // Check if there's an associated quote
      const cateringQuote = cateringRequest.CateringQuote;

      // Use transaction to ensure data consistency
      if (cateringQuote) {
        // Check if there's an associated payment
        const cateringPayment = cateringQuote.CateringPayment;

        if (cateringPayment) {
          // Check payment status before deletion
          if (cateringPayment.payment_status === 'completed') {
            throwError('Cannot delete catering request with completed payment. Please contact support.', 400);
          }

          // Delete payment
          await cateringPayment.destroy({ transaction: t });
        }

      // Delete quote
        await cateringQuote.destroy({ transaction: t });
      }

      // Delete the catering request
      await cateringRequest.destroy({ transaction: t });

      // Commit transaction
      await t.commit();

      // return { success: true };
      return { message: "Catering deleted successfully" };
    } catch (err) {
      await t.rollback();
      throwError(err.message, 500);
    }
  },



  async listCaterings(restaurant_id, page = 1, limit = 10) {
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const { count, rows } = await Catering.findAndCountAll({
      where: { restaurant_id },
      limit,
      offset,
      order: [["createdAt", "DESC"]],
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


  // list one catering per restaurant
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


  // get catering by id with restaurant info
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


  // create a catering request
  async createCateringRequest({ customerId, data }) {
    const {
      catering_id,
      event_type,
      guest_count,
      event_date,
      notes,
      typeAddress,
      address_id,
      address,
      latitude,
      longitude,
    } = data;

    const t = await sequelize.transaction();

    if (!event_type || !guest_count || !event_date)
      throwError("Missing required fileds", 400);

    try {
      const catering = await Catering.findByPk(catering_id, { transaction: t });

      if (!catering || !catering.is_active) {
        throwError("Catering not found or inactive", 404);
      }

      if (
        guest_count < catering.min_guest_count ||
        guest_count > catering.max_guest_count
      ) {
        throwError(
          `Guest count must be between ${catering.min_guest_count} and ${catering.max_guest_count}`,
          400
        );
      }

      const today = new Date();
      const eventDateObj = new Date(event_date);
      const minDate = new Date();
      minDate.setDate(today.getDate() + catering.min_advance_days);

      if (eventDateObj < minDate) {
        throwError(
          `Event date must be at least ${catering.min_advance_days} days in advance`,
          400
        );
      }

      let location = null;


      // ========== Handle Delivery Logic ==========
      if (catering.delivery_available) {
        if (!typeAddress) {
          throwError("Address type is required for delivery catering", 400);
        }

        if (["home", "office"].includes(typeAddress)) {
          if (!address_id) {
            throwError(
              `Address ID is required when type is '${typeAddress}'`,
              400
            );
          }

          location = await Location.findByPk(address_id, { transaction: t });
          if (!location) throwError("Address not found", 404);
        } else if (typeAddress === "custom") {
          if (!address || !latitude || !longitude) {
            throwError(
              "Custom address, latitude, and longitude are required",
              400
            );
          }

          location = await Location.create(
            { address, latitude, longitude },
            { transaction: t }
          );
        } else {
          throwError(
            "Invalid address type. Must be 'home', 'office', or 'custom'",
            400
          );
        }
      } else {
        if (typeAddress || address_id || address || latitude || longitude) {
          throwError(
            "This catering does not provide delivery, so address must not be provided",
            400
          );
        }
      }

      // ========== Create Catering Request ==========
      const cateringRequest = await CateringRequest.create(
        {
          catering_id,
          customer_id: customerId,
          event_type,
          guest_count,
          event_date,
          notes,
          delivery_location_id: location ? location.id : null,
        },
        { transaction: t }
      );

      await t.commit();

      // ========== Send Notifications ==========
      try {
        // Send catering request create notifications to both staff/admin and customer
        await SendNotification.sendCateringRequestCreatedNotification(cateringRequest, catering);

      } catch (notifyErr) {
        console.error("Notification Error:", notifyErr.message);
      }

      return cateringRequest;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },


  // ================ Update My Catering Request ================
  async updateMyCateringRequest({ customerId, requestId, data }) {
    const {
      event_type,
      guest_count,
      event_date,
      notes,
      typeAddress,
      address_id,
      address,
      latitude,
      longitude,
    } = data;

    const t = await sequelize.transaction();

    try {
      const cateringRequest = await CateringRequest.findOne({
        where: { id: requestId, customer_id: customerId },
        include: [{ model: Catering }],
        transaction: t,
      });

      if (!cateringRequest) throwError("Catering request not found", 404);
      if (cateringRequest.status !== "pending")
        throwError("You can only update requests with pending status", 400);

      const catering = cateringRequest.Catering;

      // ========== Validate Guest Count ==========
      if (
        guest_count < catering.min_guest_count ||
        guest_count > catering.max_guest_count
      ) {
        throwError(
          `Guest count must be between ${catering.min_guest_count} and ${catering.max_guest_count}`,
          400
        );
      }

      // ========== Validate Event Date ==========
      const today = new Date();
      const eventDateObj = new Date(event_date);
      const minDate = new Date();
      minDate.setDate(today.getDate() + catering.min_advance_days);

      if (eventDateObj < minDate) {
        throwError(
          `Event date must be at least ${catering.min_advance_days} days in advance`,
          400
        );
      }

      // ========== Handle Delivery Logic ==========
      let location = null;

      if (catering.delivery_available) {
        if (!typeAddress) throwError("Address type is required", 400);

        if (["home", "office"].includes(typeAddress)) {
          if (!address_id)
            throwError(`Address ID is required for type '${typeAddress}'`, 400);

          location = await Location.findByPk(address_id, { transaction: t });
          if (!location) throwError("Address not found", 404);
        } else if (typeAddress === "custom") {
          if (!address || !latitude || !longitude)
            throwError(
              "Custom address, latitude, and longitude are required",
              400
            );

          location = await Location.create(
            { address, latitude, longitude },
            { transaction: t }
          );
        } else {
          throwError(
            "Invalid address type. Must be 'home', 'office', or 'custom'",
            400
          );
        }
      } else {
        if (typeAddress || address_id || address || latitude || longitude) {
          throwError(
            "This catering does not provide delivery, so address must not be provided",
            400
          );
        }
      }

      // ========== Update Request ==========
      cateringRequest.event_type = event_type;
      cateringRequest.guest_count = guest_count;
      cateringRequest.event_date = event_date;
      cateringRequest.notes = notes || null;
      cateringRequest.delivery_location_id = location ? location.id : null;

      await cateringRequest.save({ transaction: t });
      await t.commit();

      // ========== Send Notifications ==========
      try {
        // Send catering request update notifications to both staff/admin and customer
        await SendNotification.sendCateringRequestUpdatedNotification(cateringRequest);

      } catch (notifyErr) {
        console.error("Notification Error:", notifyErr.message);
      }

      return cateringRequest;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },


  // Get all catering requests
  async getAllMyCateringRequests({ customerId, page = 1, limit = 10, status }) {
    const offset = (page - 1) * limit;

    const whereClause = { customer_id: customerId };
    if (status) whereClause.status = status;

    const { rows, count } = await CateringRequest.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Catering,
          attributes: [
            "id",
            "title",
            "description",
            "menu_summary",
            "cover_image_url",
            "prepayment_percentage",
          ],
        },
        {
          model: Location,
          attributes: ["id", "address", "latitude", "longitude"],
        },
      ],
      order: [["createdAt", "DESC"]],
      offset,
      limit,
    });

    return {
      total: count,
      page,
      limit,
      data: rows,
    };
  },

  async getCateringQuoteByRequestId(customerId, cateringRequestId) {
    const request = await CateringRequest.findOne({
      where: { id: cateringRequestId, customer_id: customerId },
      include: [
        {
          model: CateringQuote,
          required: true,
        },
        {
          model: Catering,
          attributes: [
            "title",
            "prepayment_percentage",
            "contact_person",
            "contact_info",
          ],
        },
      ],
    });

    if (!request) throwError("Catering request not found", 404);

    if (request.status !== "approved") {
      throwError("Catering request not approved yet", 400);
    }

    const quote = request.CateringQuote;

    if (!quote) throwError("No quote prepared for this request", 404);

    return {
      id: quote.id,
      estimated_price: quote.estimated_price,
      description: quote.description,
      status: quote.status,
      catering_title: request.Catering.title,
      prepayment_percentage: request.Catering.prepayment_percentage,
      contact_person: request.Catering.contact_person,
      contact_info: request.Catering.contact_info,
      createdAt: quote.createdAt,
    };
  },


  // ================ Update Catering Quote By Customer
  async updateCateringQuoteByCustomer(customerId, quoteId, status) {
    const t = await sequelize.transaction();

    try {
      const quote = await CateringQuote.findByPk(quoteId, {
        include: [
          {
            model: CateringRequest,
            include: [Catering],
          },
        ],
        transaction: t,
      });

      if (!quote) throwError("Catering quote not found", 404);

      const request = quote.CateringRequest;

      if (request.customer_id !== customerId) {
        throwError("Not authorized to respond to this quote", 403);
      }

      if (quote.status !== "pending") {
        throwError("Quote can only be updated if status is pending", 400);
      }

      if (!["accepted", "negotiate", "rejected"].includes(status)) {
        throwError("Invalid status", 400);
      }

      quote.status = status;
      await quote.save({ transaction: t });

      if (status === "negotiate") {
        const { contact_person, contact_info } = request.Catering;

        const customer = await Customer.findByPk(customerId, {
          transaction: t,
        });

        if (customer.email) {
          const title = `Catering Quote Negotiation - ${request.Catering.title}`;
          const body = `
            Your catering quote requires negotiation.
            Contact Person: ${contact_person}
            Contact Info: ${contact_info}
          `;

          await sendNotificationEmail(
            customer.email,
            customer.first_name,
            customer.last_name,
            title,
            body
          );
        } else if (customer.phone_number) {
          // send with phone number nati don't forget to do it
        }
      }

      await t.commit();

      // Send catering quote status update notifications to both staff/admin and customer
      await SendNotification.sendCateringQuoteStatusNotification(quote, quote.status);

      return {
        id: quote.id,
        status: quote.status,
        catering_title: request.Catering.title,
        prepayment_percentage: request.Catering.prepayment_percentage,
      };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async getAcceptedCateringQuote({ customerId, page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;

    const { count, rows } = await CateringQuote.findAndCountAll({
      where: {
        status: "accepted",
      },
      include: [
        {
          model: CateringRequest,
          where: { customer_id: customerId },
          include: [
            {
              model: Catering,
              attributes: [
                "id",
                "title",
                "prepayment_percentage",
                "cover_image_url",
                "contact_person",
                "contact_info",
              ],
              include: [
                {
                  model: Restaurant,
                  attributes: ["id", "restaurant_name"],
                },
              ],
            },
          ],
          // attributes: ["id", "event_date", "guest_count"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    return {
      total: count,
      page,
      limit,
      data: rows.map((quote) => ({
        id: quote.id,
        estimated_price: quote.estimated_price,
        description: quote.description,
        status: quote.status,
        payment_status: quote.payment_status,
        createdAt: quote.createdAt,
        catering_request: {
          id: quote.CateringRequest.id,
          event_date: quote.CateringRequest.event_date,
          guest_count: quote.CateringRequest.guest_count,
          event_type: quote.CateringRequest.event_type,
          catering: {
            id: quote.CateringRequest.Catering.id,
            title: quote.CateringRequest.Catering.title,
            prepayment_percentage:
              quote.CateringRequest.Catering.prepayment_percentage,
            cover_image_url: quote.CateringRequest.Catering.cover_image_url,
            contact_person: quote.CateringRequest.Catering.contact_person,
            contact_info: quote.CateringRequest.Catering.contact_info,
            restaurant: quote.CateringRequest.Catering.Restaurant
              ? {
                  id: quote.CateringRequest.Catering.Restaurant.id,
                  name: quote.CateringRequest.Catering.Restaurant
                    .restaurant_name,
                }
              : null,
          },
        },
      })),
    };
  },
};

module.exports = CateringService;
