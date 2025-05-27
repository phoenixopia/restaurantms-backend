const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/protect");
const GetUser = require("../../controllers/getUser");

router.use("/auth", require("./userAuthRoutes"));
router.use("/profile-data", protect, GetUser.getUser);

module.exports = router;
