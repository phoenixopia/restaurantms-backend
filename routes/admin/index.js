const express = require("express");
const router = express.Router();

router.use("/auth", require("./auth_routes"));
router.use("/plan", require("./plan_routes"));
router.use("/subscription", require("./subscription_routes"));
router.use("/permission", require("./permission_routes")); // this maybe optional
router.use("/restaurant", require("./restaurant_routes"));
router.use("/branches", require("./branch_routes"));
router.use("/menu", require("./menu_routes"));
router.use("/categories", require("./category_routes"));
router.use("/menu-items", require("./menu_item_routes"));

module.exports = router;
