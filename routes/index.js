const express = require("express");
const router = express.Router();

// routes for admin side
router.use("/admin", require("./admin/index"));

// routes for customers side
router.use("/customer", require("./customer/index"));

module.exports = router;
