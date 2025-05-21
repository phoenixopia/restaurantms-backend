const express = require("express");
const router = express.Router();

router.use("/auth", require("./auth_routes"));
router.use("/plan", require("./plan_routes"));
router.use("/subscription", require("./subscription_routes"));
router.use("/restaurant", require("./restaurant_routes"));
router.use("/admin/branches", require("./admin/branch"));

module.exports = router;
