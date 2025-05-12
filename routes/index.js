const express = require("express");
const router = express.Router();

// auth routes for admin
router.use("/admin/auth", require("./admin/admin_auth_routes"));

// auth routes for customers
router.use("/customer/auth", require("./customer/userAuthRoutes"));

module.exports = router;
