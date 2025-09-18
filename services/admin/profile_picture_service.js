const fs = require("fs/promises");
const path = require("path");

const { Op } = require("sequelize");
const throwError = require("../../utils/throwError");
const cleanupUploadedFiles = require("../../utils/cleanUploadedFiles");
const { User, sequelize } = require("../../models");
const { getFileUrl, getFilePath } = require("../../utils/file");
const SendNotification = require("../../utils/send_notification");
const logActivity = require("../../utils/logActivity");

const UPLOAD_FOLDER = "profile";

const ProfileService = {
  async getProfile(user) {
    const profile = await User.findByPk(user.id);
    if (!profile) throwError("Profile not found", 404);
    return profile;
  },

  async updateProfile(userId, body, files = []) {
    const { first_name, last_name, type, emailOrPhone } = body;
    const profileFile = files.find((file) => file.fieldname === "profile");

    const t = await sequelize.transaction();
    try {
      const user = await User.findByPk(userId, { transaction: t });
      if (!user) {
        if (files.length) await cleanupUploadedFiles(files);
        throwError("user not found", 404);
      }

      const oldData = user.toJSON();

      if (profileFile && user.profile_picture) {
        const filename = path.basename(user.profile_picture);
        const oldPath = getFilePath(UPLOAD_FOLDER, filename);
        await fs.unlink(oldPath).catch(() => {});
      }

      if (first_name !== undefined) user.first_name = first_name;
      if (last_name !== undefined) user.last_name = last_name;
      if (type === "email" && emailOrPhone !== undefined)
        user.email = emailOrPhone;
      else if (type === "phone" && emailOrPhone !== undefined)
        user.phone_number = emailOrPhone;

      if (profileFile)
        user.profile_picture = getFileUrl(UPLOAD_FOLDER, profileFile.filename);

      await user.save({ transaction: t });

      await logActivity({
        user_id: userId,
        module: "Profile",
        action: "Update",
        details: { before: oldData, after: user.toJSON() },
        transaction: t,
      });

      await t.commit();

      await SendNotification.sendProfileUpdateNotification(user.id, userId);

      return {
        message: "Profile updated successfully",
        data: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          phone_number: user.phone_number,
          email: user.email,
          profile: user.profile_picture ?? null,
        },
      };
    } catch (err) {
      if (!t.finished) await t.rollback();
      if (files.length) await cleanupUploadedFiles(files);
      throw err;
    }
  },
};

module.exports = ProfileService;
