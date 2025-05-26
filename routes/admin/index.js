const express = require("express");
const router = express.Router();

router.use("/auth", require("./authRoutes"));
router.use("/plan", require("./plan_routes"));
router.use("/subscription", require("./subscription_routes"));
router.use("/restaurant", require("./restaurant_routes"));
router.use("/branch", require("./branch_routes"));

module.exports = router;
