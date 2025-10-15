const express = require("express");

const AnalyticsSnapshotController = require("../../controllers/admin/analytics_snapshot_controller");
const { permissionCheck } = require("../../middleware/permissionCheck");
const { authorize } = require("../../middleware/authorize");
const { protect } = require("../../middleware/protect");
const router = express.Router();

router.get(
  "/view-analytics-super",
  protect("user"),
  authorize("super_admin"),
  AnalyticsSnapshotController.viewAnalyticsSuperAdmin
);

router.get(
  "/view-analytics-admin",
  protect("user"),
  authorize("restaurant_admin", "staff"),
  AnalyticsSnapshotController.viewAnalyticsAdminSide
);

module.exports = router;
