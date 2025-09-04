const express = require("express");
const router = express.Router();

router.use("/auth", require("./authRoutes"));

router.use("/subscription", require("./subscription_routes"));
router.use("/user", require("./userManage_routes"));
router.use("/restaurant", require("./restaurant_routes"));
router.use("/kds", require("./kds"));

// ===================================================
router.use("/catering", require("./catering_routes"));
//====================================================

router.use("/table", require("./table_routes"));
router.use("/social-media", require("./video_routes"));
router.use("/transaction", require("./transaction_routes"));
router.use("/notification", require("./notification_routes"));
router.use("/inventory", require("./inventory_routes"));
router.use("/support-ticket", require("./support_ticket_routes"));
router.use("/activity-log", require("./activityLog_routes"));
router.use("/review", require("./review_routes"));
router.use("/plan", require("./plan_routes"));
router.use("/rbac", require("./rbac_routes"));
router.use("/menu", require("./menu_routes"));

module.exports = router;
