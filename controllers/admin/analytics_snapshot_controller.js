const AnalyticsSnapshotService = require("../../services/admin/analytics_snapshot_service");
const { success } = require("../../utils/apiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const throwError = require("../../utils/throwError");

exports.viewAnalyticsSuperAdmin = asyncHandler(async (req, res) => {
  const filter = req.query.filter || "uptoNow";
  const result = await AnalyticsSnapshotService.viewAnalyticsSuperAdmin(
    req.user,
    filter
  );
  return success(res, "Analytics snapshot fetched successfully", result);
});

exports.viewAnalyticsAdminSide = asyncHandler(async (req, res) => {
  const filter = req.query.filter || "uptoNow";
  const result = await AnalyticsSnapshotService.viewAnalyticsAdminSide(
    req.user,
    filter
  );
  return success(res, "Analytics snapshot fetched successfully", result);
});


// Analytics staff side
exports.viewAnalyticsStaffSide = async (req, res) => {
  try {
    const staffId = req.user.id;
    const restaurantId = req.user.restaurant_id;
    const branchId = req.user.branch_id;

    if (!staffId || !restaurantId || !branchId) {
      // return res.status(400).json({ message: "Invalid staff or restaurant context." });
      throwError("Invalid staff, restaurant or branch context.", 400);
    }

    const analytics = await AnalyticsSnapshotService.getStaffAnalytics({ staffId, restaurantId, branchId });

    return success(res, "Staff analytics retrieved successfully", analytics, 200);
  } catch (error) {
    console.error("Error fetching staff analytics:", error);
    throwError(error.message || "Server error while fetching staff analytics", 500);
  }
};

