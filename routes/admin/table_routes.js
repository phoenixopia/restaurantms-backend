const express = require("express");
const { permissionCheck } = require("../../middleware/permissionCheck");
const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");

const router = express.Router();

module.exports = router;
