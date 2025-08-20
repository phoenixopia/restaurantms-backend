const { Branch } = require("../models");
const { calculateStorageQuota } = require("../utils/storageUtils");
const cleanupUploadedFiles = require("../utils/cleanUploadedFiles");

checkStorageQuota = async (req, res, next) => {
  try {
    let restaurantId = req.user?.restaurant_id;

    if (!restaurantId && req.user?.branch_id) {
      const branch = await Branch.findByPk(req.user.branch_id);
      if (!branch) {
        return res.status(400).json({
          success: false,
          message: "Branch not found for current user.",
        });
      }
      restaurantId = branch.restaurant_id;
    }

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "Could not resolve restaurant ID.",
      });
    }

    const files = req.files
      ? Array.isArray(req.files)
        ? req.files
        : Object.values(req.files).flat()
      : req.file
      ? [req.file]
      : [];

    const result = await calculateStorageQuota(restaurantId, files);

    if (result.exceeded) {
      await cleanupUploadedFiles(files);
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }

    return next();
  } catch (err) {
    console.error("Storage quota check error:", err);
    await cleanupUploadedFiles(req.files);
    return res.status(500).json({
      success: false,
      message: "Internal server error during storage quota check.",
    });
  }
};

module.exports = checkStorageQuota;
