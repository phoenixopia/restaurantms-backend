const express = require("express");
const router = express.Router();

const ActivityLogController = require("../../controllers/admin/activity_log_controller");
const { protect } = require("../../middleware/protect");
const { permissionCheck } = require("../../middleware/permissionCheck");

router.get(
  "/view-activity-logs",
  protect("user"),
  permissionCheck("view_activity_logs"),
  ActivityLogController.getActivityLogs
);

router.get(
  "/view-detail/:id",
  protect("user"),
  permissionCheck("view_activity_logs"),
  ActivityLogController.getActivityLogById
);

module.exports = router;
