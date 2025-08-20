const express = require("express");
const router = express.Router();

router.use("/auth", require("./authRoute"));
router.use("/restaurant", require("./restaurant_routes"));
router.use("/2fa", require("./two_factor_auth"));
router.use("/profile", require("./profile_routes"));
router.use("/order", require("./order_routes"));
router.use("/payment", require("./payment_routes"));
router.use("/video", require("./video_routes"));
router.use("/catering", require("./catering_routes"));
router.use("/notification", require("./notification_routes"));
router.use("./review", require("./review_routes"));

module.exports = router;
