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

  async updateProfile(customerId, body, files = []) {
    const { first_name, last_name, type, emailOrPhone } = body;
    const profileFile = files.find((file) => file.fieldname === "profile");

    const t = await sequelize.transaction();

    try {
      const customer = await Customer.findByPk(customerId, { transaction: t });

      if (!customer) {
        if (files.length) await cleanupUploadedFiles(files);
        throwError("Customer not found", 404);
      }

      if (profileFile && customer.profile_picture) {
        const oldPath = getFilePath(UPLOAD_FOLDER, customer.profile_picture);
        await fs.unlink(oldPath).catch(() => {});
      }

      if (first_name !== undefined) customer.first_name = first_name;
      if (last_name !== undefined) customer.last_name = last_name;

      if (type === "email" && emailOrPhone !== undefined) {
        customer.email = emailOrPhone;
      } else if (type === "phone" && emailOrPhone !== undefined) {
        customer.phone = emailOrPhone;
      }

      if (profileFile) customer.profile_picture = profileFile.filename;

      await customer.save({ transaction: t });
      await t.commit();

      return {
        message: "Profile updated successfully",
        data: {
          id: customer.id,
          first_name: customer.first_name,
          last_name: customer.last_name,
          phone_number: customer.phone,
          email: customer.email,
          profile: getFileUrl(UPLOAD_FOLDER, customer.profile_picture),
        },
      };
    } catch (err) {
      await t.rollback();
      if (files.length) await cleanupUploadedFiles(files);
      throw err;
    }
  },
};

module.exports = ProfileService;
