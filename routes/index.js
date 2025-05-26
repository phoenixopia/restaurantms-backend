const express = require("express");
const router = express.Router();

// auth routes for all users and customers
router.use("/auth", require("./auth_routes"));

// route for 2FA
router.use("/auth/2fa", require("./two_factor_auth"));

// route for role management
router.use("/admin/roles", require("./admin/role_routes"));

// route for user management
router.use("/admin/users", require("./admin/user_routes"));

// route for permission management
router.use("/admin/permissions", require("./admin/permission_routes"));

// route for plan management
router.use("/admin/plans", require("./admin/plan_routes"));

// route for restaurant management
router.use("/admin/restaurants", require("./admin/restaurant_routes"));



module.exports = router;
