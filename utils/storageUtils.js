const {
  Branch,
  Subscription,
  Plan,
  PlanLimit,
  UploadedFile,
} = require("../models");
const { fn, col } = require("sequelize");

const calculateStorageQuota = async (restaurantId, incomingFiles) => {
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
    return {
      exceeded: true,
      message: "Active subscription with storage quota not found.",
      status: 403,
    };
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
  for (const file of incomingFiles) {
    const sizeBytes = file.size || 0;
    const sizeMb = sizeBytes / (1024 * 1024);
    incomingSizeMb += sizeMb;
  }

  const totalAfterUploadMb = usedMb + incomingSizeMb;

  if (totalAfterUploadMb > quotaMb) {
    return {
      exceeded: true,
      message: `Storage quota exceeded: You’ve used ${(usedMb / 1024).toFixed(
        2
      )}GB of ${quotaGb.toFixed(2)}GB. This upload adds ${(
        incomingSizeMb / 1024
      ).toFixed(2)}GB and exceeds your limit.`,
      status: 413,
    };
  }

  return { exceeded: false, status: 200 };
};

module.exports = { calculateStorageQuota };
