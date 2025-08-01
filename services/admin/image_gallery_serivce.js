const fs = require("fs/promises");
const { ImageGallery, Restaurant, sequelize } = require("../../models");
const throwError = require("../../utils/throwError");
const cleanupUploadedFiles = require("../../utils/cleanUploadedFiles");
const { getFileUrl, getFilePath } = require("../../utils/file");

const UPLOAD_FOLDER = "image-gallery";

const ImageGalleryService = {
  async uploadImage({ files, captions = [], restaurant_id }) {
    if (!files) {
      await cleanupUploadedFiles(files);
      throwError("At least one image is required", 400);
    }

    const t = await sequelize.transaction();
    try {
      const images = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const caption = captions[i] || null;

        const image_url = getFileUrl(UPLOAD_FOLDER, file.filename);

        const image = await ImageGallery.create(
          {
            restaurant_id,
            image_url,
            caption,
          },
          { transaction: t }
        );

        images.push(image);
      }
      await t.commit();
      return images;
    } catch (err) {
      await t.rollback();
      await cleanupUploadedFiles(files);
      throw err;
    }
  },

  async getImageById({ id, restaurant_id = null }) {
    const where = { id };
    if (restaurant_id) where.restaurant_id = restaurant_id;

    const image = await ImageGallery.findOne({ where });

    if (!image) {
      throwError("Image not found", 404);
    }

    return image;
  },

  async listImages({ restaurant_id, page = 1, limit = 10 }) {
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const { count, rows } = await ImageGallery.findAndCountAll({
      where: { restaurant_id },
      limit,
      offset,
      order: [["created_at", "DESC"]],
    });

    return {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      images: rows,
    };
  },

  async updateImageById({ id, restaurant_id, file, caption }) {
    if (!file && caption === undefined) {
      throwError("Nothing to update", 400);
    }

    const image = await ImageGallery.findOne({ where: { id, restaurant_id } });

    if (!image) {
      await cleanupUploadedFiles(file ? [file] : []);
      throwError("Image not found", 404);
    }

    const oldImagePath = getFilePath(image.image_url);

    const updateData = {};

    if (file) {
      updateData.image_url = getFileUrl(UPLOAD_FOLDER, file.filename);
    }

    if (caption !== undefined) {
      updateData.caption = caption;
    }

    try {
      await image.update(updateData);
      if (file) {
        await fs.unlink(oldImagePath).catch(() => {});
      }
      return image;
    } catch (err) {
      await cleanupUploadedFiles(file ? [file] : []);
      throw err;
    }
  },
};

module.exports = ImageGalleryService;
