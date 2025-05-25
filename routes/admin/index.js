const express = require("express");
const router = express.Router();

router.use("/auth", require("./authRoutes"));
router.use("/plan", require("./plan_routes"));

module.exports = router;
