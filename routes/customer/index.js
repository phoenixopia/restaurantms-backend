const express = require("express");
const router = express.Router();

router.use("/auth", require("./userAuthRoutes"));
router.use("/restaurant", require("./restaurant_routes"));

module.exports = router;
