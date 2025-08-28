const express = require("express");
const { protect } = require("../../middleware/protect");
const { permissionCheck } = require("../../middleware/permissionCheck");
const TableController = require("../../controllers/admin/table_controller");

const router = express.Router();

// ------------------ Table Routes ------------------

// Create table (restaurant or branch users)
router.post(
  "/",
  protect("user"),
  // permissionCheck("create_table"),
  TableController.createTable
);

// Get all tables (with filters, pagination, search)
router.get(
  "/",
  protect("user"),
  // permissionCheck("view_tables"),
  TableController.getTables
);

// Get table by ID
router.get(
  "/get-by-id/:id",
  protect("user"),
  // permissionCheck("view_tables"),
  TableController.getTableById
);

// Update table
router.put(
  "/update/:id",
  protect("user"),
  // permissionCheck("update_table"),
  TableController.updateTable
);

// Delete table
router.delete(
  "/delete/:id",
  protect("user"),
  // permissionCheck("delete_table"),
  TableController.deleteTable
);

// Table KPIs
router.get(
  "/kpi/all",
  protect("user"),
  // permissionCheck("view_tables"),
  TableController.getTableKPI
);

module.exports = router;
