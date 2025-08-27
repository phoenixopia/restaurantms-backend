"use strict";

const fs = require("fs/promises");
const { Customer, Location, sequelize } = require("../../models");
const throwError = require("../../utils/throwError");
const cleanupUploadedFiles = require("../../utils/cleanUploadedFiles");
const { getFileUrl, getFilePath } = require("../../utils/file");

const UPLOAD_FOLDER = "profile";

const ProfileService = {
  async updateAddress(customerId, type, { address, latitude, longitude }) {
    if (!["home", "office"].includes(type)) {
      throwError("Invalid address type", 400);
    }

    if (!address || latitude === undefined || longitude === undefined) {
      throwError("Address, latitude and longitude are required", 400);
    }

    const t = await sequelize.transaction();
    try {
      const location = await Location.create(
        { address, latitude, longitude },
        { transaction: t }
      );

      const customer = await Customer.findByPk(customerId, { transaction: t });
      if (!customer) throwError("Customer not found", 404);

      if (type === "home") {
        customer.home_address_id = location.id;
      } else {
        customer.office_address_id = location.id;
      }

      await customer.save({ transaction: t });
      await t.commit();

      return {
        message: `${type} address updated successfully`,
        data: {
          location: {
            id: location.id,
            address: location.address,
            latitude: location.latitude,
            longitude: location.longitude,
          },
        },
      };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async updateMultipleAddresses(customerId, payload) {
    const { home, office } = payload;

    if (!home && !office) {
      throwError(
        "At least one of 'home' or 'office' address must be provided",
        400
      );
    }

    const t = await sequelize.transaction();
    try {
      const customer = await Customer.findByPk(customerId, { transaction: t });
      if (!customer) throwError("Customer not found", 404);

      const responseData = {};

      if (home) {
        const { address, latitude, longitude } = home;
        if (!address || latitude === undefined || longitude === undefined) {
          throwError("Home address, latitude and longitude are required", 400);
        }

        const homeLocation = await Location.create(
          { address, latitude, longitude },
          { transaction: t }
        );
        customer.home_address_id = homeLocation.id;
        responseData.home = {
          id: homeLocation.id,
          address: homeLocation.address,
          latitude: homeLocation.latitude,
          longitude: homeLocation.longitude,
        };
      }

      if (office) {
        const { address, latitude, longitude } = office;
        if (!address || latitude === undefined || longitude === undefined) {
          throwError(
            "Office address, latitude and longitude are required",
            400
          );
        }

        const officeLocation = await Location.create(
          { address, latitude, longitude },
          { transaction: t }
        );
        customer.office_address_id = officeLocation.id;
        responseData.office = {
          id: officeLocation.id,
          address: officeLocation.address,
          latitude: officeLocation.latitude,
          longitude: officeLocation.longitude,
        };
      }

      await customer.save({ transaction: t });
      await t.commit();

      return {
        message: "Addresses updated successfully",
        data: responseData,
      };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async uploadImage(file, itemId, user) {
    const t = await sequelize.transaction();

    try {
      if (!file) throwError("No image file uploaded", 400);

      const menuItem = await MenuItem.findByPk(itemId, {
        include: [{ model: MenuCategory }],
        transaction: t,
      });

      if (!menuItem) throwError("Menu item not found", 404);

      const category = menuItem.MenuCategory;
      if (!category) throwError("Menu category not found for this item", 400);

      // Authorization
      if (user.restaurant_id && category.restaurant_id !== user.restaurant_id)
        throwError("Not authorized", 403);
      if (user.branch_id && category.branch_id !== user.branch_id)
        throwError("Not authorized", 403);
      if (!user.restaurant_id && !user.branch_id)
        throwError("User must belong to a restaurant or branch", 400);

      // Check if an UploadedFile exists
      let uploadedFile = await UploadedFile.findOne({
        where: { reference_id: menuItem.id, type: "menu-item" },
        transaction: t,
      });

      const newFilePath = getFilePath(UPLOAD_FOLDER, file.filename);

      if (uploadedFile && uploadedFile.path) {
        // Delete old file first
        const oldPath = getFilePath(
          UPLOAD_FOLDER,
          path.basename(uploadedFile.path)
        );
        await fs.unlink(oldPath).catch(() => {});

        // Update uploaded file
        uploadedFile.path = newFilePath;
        uploadedFile.size_mb = file.size / (1024 * 1024);
        uploadedFile.uploaded_by = user.id;
        await uploadedFile.save({ transaction: t });
      } else {
        // Create new UploadedFile
        uploadedFile = await UploadedFile.create(
          {
            restaurant_id: category.restaurant_id,
            path: newFilePath,
            size_mb: file.size / (1024 * 1024),
            uploaded_by: user.id,
            type: "menu-item",
            reference_id: menuItem.id,
          },
          { transaction: t }
        );
      }

      // Update menuItem with URL (not disk path)
      menuItem.image = getFileUrl(UPLOAD_FOLDER, file.filename);
      await menuItem.save({ transaction: t });

      await t.commit();

      return {
        ...menuItem.toJSON(),
        image_url: menuItem.image,
      };
    } catch (err) {
      await t.rollback();

      // Delete newly uploaded file if error occurred
      if (file) {
        const newFilePath = getFilePath(UPLOAD_FOLDER, file.filename);
        await fs.unlink(newFilePath).catch(() => {});
      }

      throw err;
    }
  },
};

module.exports = ProfileService;
