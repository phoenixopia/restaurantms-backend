const AnalyticsSnapshotService = require("../../services/admin/analytics_snapshot_service");
const { success } = require("../../utils/apiResponse");
const asyncHandler = require("../../utils/asyncHandler");

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
