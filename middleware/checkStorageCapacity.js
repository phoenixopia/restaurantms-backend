const {
  Branch,
  Subscription,
  Plan,
  PlanLimit,
  UploadedFile,
} = require("../models");
const { fn, col } = require("sequelize");

const checkStorageQuota = async (req, res, next) => {
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

    const subscription = await Subscription.findOne({
      where: { restaurant_id: restaurantId, status: "active" },
      include: [
        {
          model: Plan,
          include: [
            {
              model: PlanLimit,
              where: { key: "storage_quota_gb" },
              required: true,
            },
          ],
        },
      ],
    });

    if (!subscription || !subscription.Plan?.PlanLimits?.length) {
      return res.status(403).json({
        success: false,
        message: "Active subscription with storage quota not found.",
      });
    }

    const quotaGb = parseFloat(subscription.Plan.PlanLimits[0].value);
    const quotaMb = quotaGb * 1024;

    const usage = await UploadedFile.findOne({
      where: { restaurant_id: restaurantId },
      attributes: [[fn("SUM", col("size_mb")), "total"]],
      raw: true,
    });

    const usedMb = parseFloat(usage.total || 0);

    let incomingSizeMb = 0;

    const files = req.files
      ? Array.isArray(req.files)
        ? req.files
        : Object.values(req.files).flat()
      : req.file
      ? [req.file]
      : [];

    for (const file of files) {
      const sizeBytes = file.size || 0;
      const sizeMb = sizeBytes / (1024 * 1024);
      incomingSizeMb += sizeMb;
    }

    const totalAfterUploadMb = usedMb + incomingSizeMb;

    if (totalAfterUploadMb > quotaMb) {
      return res.status(413).json({
        success: false,
        message: `Storage quota exceeded: You’ve used ${(usedMb / 1024).toFixed(
          2
        )}GB of ${quotaGb.toFixed(2)}GB. This upload adds ${(
          incomingSizeMb / 1024
        ).toFixed(2)}GB and exceeds your limit.`,
      });
    }

    return next();
  } catch (err) {
    console.error("Storage quota check error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error during storage quota check.",
    });
  }
};

module.exports = checkStorageQuota;
