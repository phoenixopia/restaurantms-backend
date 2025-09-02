const express = require("express");
const router = express.Router();

const ActivityLogController = require("../../controllers/admin/activity_log_controller");
const { protect } = require("../../middleware/protect");
const { permissionCheck } = require("../../middleware/permissionCheck");
const { authorize } = require("../../middleware/authorize");

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

router.get(
  "/view-whole-activity-logs",
  protect("user"),
  authorize("super_admin"),
  ActivityLogController.getWholeActivityLog
);

router.get(
  "/view-whole-activity-log/:id",
  protect("user"),
  authorize("super_admin"),
  ActivityLogController.getWholeActivityLogById
);

module.exports = router;
