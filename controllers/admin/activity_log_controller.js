const asyncHandler = require("../../utils/asyncHandler");
const ActivityLogService = require("../../services/admin/activity_log_service");
const { success } = require("../../utils/apiResponse");

exports.getActivityLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const result = await ActivityLogService.getActivityLogs(req.user, {
    page,
    limit,
  });

  return success(res, "Activity log fetched successfully", result);
});

exports.getActivityLogById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await ActivityLogService.getActivityLogById(id);

  return success(res, "Activity log detail fetched successfully", result);
});
