const express = require("express");
const TwoFactorAuth = require("../../controllers/customer/twoFAController");
const router = express.Router();
const { protect } = require("../../middleware/protect");

// auth routes
router.get("/", protect("customer"), TwoFactorAuth.setup2FA);

module.exports = router;
