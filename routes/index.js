const express = require("express");
const router = express.Router();

// auth routes for all users and customers
router.use("/auth", require("./auth/authRoute"));

// route for 2FA
router.use("/auth/2fa", require("./auth/twoFactorAuth"));

// route for role management
router.use("/admin/roles", require("./admin/roleRoute"));

// route for user management
router.use("/admin/users", require("./admin/userRoute"));

// route for permission management
router.use("/admin/permissions", require("./admin/permissionRoute"));

// route for plan management
router.use("/admin/plans", require("./admin/admin_plan_routes"));

// route for restaurant management
router.use("/admin/restaurants", require("./admin/restaurant_route"));



module.exports = router;
