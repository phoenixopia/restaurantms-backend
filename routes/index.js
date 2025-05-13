const express = require("express");
const router = express.Router();

// auth routes for admin both super admin and restaurant admin
router.use("/admin/auth", require("./admin/admin_auth_routes"));

// route for super admin
router.use("/admin/plan", require("./admin/super-admin/admin_plan_routes"));

// route for restaurant admin
router.use(
  "/admin/restaurant",
  require("./admin/restaurant-admin/restaurant_route")
);

// auth routes for customers
router.use("/customer/auth", require("./customer/userAuthRoutes"));

module.exports = router;
