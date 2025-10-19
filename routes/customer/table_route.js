const express = require("express");
const { protect } = require("../../middleware/protect");
const { permissionCheck } = require("../../middleware/permissionCheck");
const TableController = require("../../controllers/admin/table_controller");

const router = express.Router();

// ------------------ Table Routes ------------------

// Get all tables (with filters, pagination, search)
router.get(
  "/get-all-tables",
  protect("customer"),
  // permissionCheck("view_tables"),
  TableController.getTables
);

// // Get table by ID
// router.get(
//   "/get-by-id/:id",
//   protect("user"),
//   // permissionCheck("view_tables"),
//   TableController.getTableById
// );

module.exports = router;
