const fs = require("fs/promises");
const { ImageGallery, Restaurant, sequelize } = require("../../models");
const throwError = require("../../utils/throwError");
const cleanupUploadedFiles = require("../../utils/cleanUploadedFiles");
const { getFileUrl, getFilePath } = require("../../utils/file");

const UPLOAD_FOLDER = "image-gallery";

const ImageGallery = {
  async uploadImage({ files, captions = [], restaurant_id }) {
    if (!files || FileSystem.length === 0) {
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
};
