const express = require("express");
const router = express.Router();

router.use("/auth", require("./authRoute"));
router.use("/restaurant", require("./restaurant_routes"));
router.use("/2fa", require("./two_factor_auth"));

module.exports = router;
