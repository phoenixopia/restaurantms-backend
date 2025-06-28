const express = require("express");
const router = express.Router();

router.use("/auth", require("./authRoutes"));
router.use("/plan", require("./plan_routes"));
router.use("/rbac", require("./rbac_routes"));
router.use("/subscription", require("./subscription_routes"));
router.use("/restaurant", require("./restaurant_routes"));
router.use("/user", require("./userManage_routes"));
router.use("/menu", require("./menu_routes"));
router.use("/menu-category", require("./menuCategory_routes"));
router.use("/menu-item", require("./menuItem_routes"));

module.exports = router;
