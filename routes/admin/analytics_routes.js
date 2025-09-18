const express = require("express");
const { permissionCheck } = require("../../middleware/permissionCheck");
const { authorize } = require("../../middleware/authorize");
const { protect } = require("../../middleware/protect");
const router = express.Router();

module.exports = router;
