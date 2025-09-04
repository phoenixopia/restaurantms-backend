const { Branch } = require("../models");
const { calculateStorageQuota } = require("../utils/storageUtils");
const cleanupUploadedFiles = require("../utils/cleanUploadedFiles");
const { error } = require("../utils/apiResponse");

const checkStorageQuota = async (req, res, next) => {
  try {
    let restaurantId = req.user?.restaurant_id;

    if (!restaurantId && req.user?.branch_id) {
      const branch = await Branch.findByPk(req.user.branch_id);
      if (!branch) {
        return error(res, "Branch not found for current user", null, 400);
      }
      restaurantId = branch.restaurant_id;
    }

    if (!restaurantId) {
      return error(res, "Could not resolve restaurant ID", null, 400);
    }

    const files = req.files ? Object.values(req.files).flat() : [];
    const result = await calculateStorageQuota(restaurantId, files);

    if (result.exceeded) {
      await cleanupUploadedFiles(files);
      return error(res, result.message, null, result.status);
    }

    next();
  } catch (err) {
    console.error("Storage quota check error:", err);
    const files = req.files ? Object.values(req.files).flat() : [];
    await cleanupUploadedFiles(files);
    return error(
      res,
      "Internal server error during storage quota check",
      null,
      500
    );
  }
};

module.exports = checkStorageQuota;
