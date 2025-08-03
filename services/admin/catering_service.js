const {
  Catering,
  CateringRequest,
  Restaurant,
  Branch,
  Location,
  ImageGallery,
  SystemSetting,
  sequelize,
} = require("../../models");
const throwError = require("../../utils/throwError");
const cleanupUploadedFiles = require("../../utils/cleanUploadedFiles");
const { getFileUrl, getFilePath } = require("../../utils/file");

const UPLOAD_FOLDER = "catering-card";
const CateringService = {
  async createCatering({ data, file }) {
    const { restaurant_id, gallery_image_ids = [], ...restData } = data;

    const t = await sequelize.transaction();

    try {
      let coverImageUrl = null;

      if (file) {
        coverImageUrl = getFileUrl(UPLOAD_FOLDER, file.filename);
      }

      if (gallery_image_ids.length > 0) {
        const galleryImages = await ImageGallery.findAll({
          where: {
            id: gallery_image_ids,
            restaurant_id,
          },
        });

        if (galleryImages.length !== gallery_image_ids.length) {
          await cleanupUploadedFiles(file ? [file] : []);
          throwError(
            "Some gallery images are invalid or do not belong to this restaurant",
            400
          );
        }
      }

      const catering = await Catering.create(
        {
          ...restData,
          restaurant_id,
          gallery_image_ids,
          cover_image_url: coverImageUrl,
        },
        { transaction: t }
      );

      await t.commit();
      return catering;
    } catch (err) {
      await t.rollback();
      await cleanupUploadedFiles(file ? [file] : []);
      throw err;
    }
  },

  async updateCatering(id, restaurant_id, data, file) {
    const catering = await Catering.findOne({ where: { id, restaurant_id } });
    if (!catering) throwError("Catering not found", 404);

    const { gallery_image_ids = [], ...updateData } = data;

    const t = await sequelize.transaction();

    try {
      if (gallery_image_ids.length > 0) {
        const validImages = await ImageGallery.findAll({
          where: {
            id: gallery_image_ids,
            restaurant_id,
          },
        });

        if (validImages.length !== gallery_image_ids.length) {
          await cleanupUploadedFiles(file ? [file] : []);
          throwError(
            "Some gallery images are invalid or do not belong to this restaurant",
            400
          );
        }

        updateData.gallery_image_ids = gallery_image_ids;
      }

      if (file) {
        const newCoverImageUrl = getFileUrl(UPLOAD_FOLDER, file.filename);

        if (catering.cover_image_url) {
          await deleteFile(catering.cover_image_url);
        }

        updateData.cover_image_url = newCoverImageUrl;
      }

      await catering.update(updateData, { transaction: t });
      await t.commit();
      return catering;
    } catch (err) {
      await t.rollback();
      await cleanupUploadedFiles(file ? [file] : []);
      throw err;
    }
  },

  async deleteCatering(id, restaurant_id) {
    const catering = await Catering.findOne({ where: { id, restaurant_id } });
    if (!catering) throwError("Catering not found", 404);

    const t = await sequelize.transaction();
    try {
      await catering.destroy({ transaction: t });
      await t.commit();
      return { message: "Catering deleted successfully" };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async toggleCateringStatus(id, restaurant_id) {
    const catering = await Catering.findOne({ where: { id, restaurant_id } });
    if (!catering) throwError("Catering not found", 404);

    const newStatus = !catering.is_active;

    const t = await sequelize.transaction();
    try {
      await catering.update({ is_active: newStatus }, { transaction: t });
      await t.commit();
      return { id: catering.id, is_active: newStatus };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async getCateringById(id) {
    const catering = await Catering.findByPk(id);
    if (!catering) throwError("Catering not found", 404);

    const restaurant_id = catering.restaurant_id;

    // Fetch the restaurant name
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

    let gallery_images = [];
    if (
      Array.isArray(catering.gallery_image_ids) &&
      catering.gallery_image_ids.length > 0
    ) {
      gallery_images = await ImageGallery.findAll({
        where: {
          id: catering.gallery_image_ids,
          restaurant_id,
        },
        attributes: ["id", "image_url"],
      });
    }

    return {
      ...catering.toJSON(),
      gallery_images,
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

    const allGalleryImageIds = rows
      .map((c) =>
        Array.isArray(c.gallery_image_ids) ? c.gallery_image_ids : []
      )
      .flat();

    let allGalleryImages = [];
    if (allGalleryImageIds.length > 0) {
      allGalleryImages = await ImageGallery.findAll({
        where: {
          id: allGalleryImageIds,
          restaurant_id,
        },
        attributes: ["id", "image_url"],
      });
    }

    const galleryMap = {};
    allGalleryImages.forEach((img) => {
      galleryMap[img.id] = img;
    });

    const enrichedCaterings = rows.map((catering) => {
      const gallery_ids = Array.isArray(catering.gallery_image_ids)
        ? catering.gallery_image_ids
        : [];

      const gallery_images = gallery_ids
        .map((id) => galleryMap[id])
        .filter(Boolean);

      return {
        ...catering.toJSON(),
        gallery_images,
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

        let gallery_images = [];
        if (
          Array.isArray(catering.gallery_image_ids) &&
          catering.gallery_image_ids.length > 0
        ) {
          gallery_images = await ImageGallery.findAll({
            where: {
              id: catering.gallery_image_ids,
              restaurant_id: catering.restaurant_id,
            },
            attributes: ["id", "image_url"],
          });
        }

        return {
          ...catering,
          gallery_images,
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
