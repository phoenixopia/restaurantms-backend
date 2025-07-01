const express = require("express");
const router = express.Router();

// auth routes for users and customers, 2FA, user, role, and permissions management
router.use("/auth", require("./auth_routes"));
router.use("/users", require("./user_routes"));
router.use("/auth/2fa", require("./two_factor_auth"));
router.use("/roles", require("./role_routes"));
router.use("/permissions", require("./permission_routes"));


// route for plan and subscription management
// router.use("/plans", require("./plan_routes"));
router.use("/subscriptions", require("./subscription_routes"));


// route for restaurant, branch management
router.use("/restaurants", require("./restaurant_route"));
router.use("/branches", require("./branch_routes"));

// route for menu, category and items, order, order items, tables
// router.use("/menus", require("./menu_routes"));
// router.use("/menu/categories", require("./category_routes"));
// router.use("/menu/items", require("./menu_item_routes"));
// router.use("/orders", require("./order_route"));
// router.use("/order/items", require("./order_item_route"));
// router.use("/tables", require("./table_routes"));

// route for search, activity log
router.use("/search", require("./searchRoute"));
router.use("/activity_logs", require("./activityLog_routes"));

// models route: for plan, reviews, tables, orders_items, orders, menus, menu/items, menu/categories
router.use("/", require("./modelRoute"));

module.exports = router;
