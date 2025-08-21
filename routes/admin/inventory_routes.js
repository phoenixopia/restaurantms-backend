const express = require("express");
const router = express.Router();

const InventoryController = require("../../controllers/admin/inventory_controller");
const { protect } = require("../../middleware/protect");

const { permissionCheck } = require("../../middleware/permissionCheck");

// ======================= Inventory ===========
router.get(
  "/get-all-inventory",
  protect("user"),
  permissionCheck("view_inventory"),
  InventoryController.getAllInventory
);

router.put(
  "/update-inventory/:id",
  protect("user"),
  permissionCheck("update_inventory"),
  InventoryController.updateInventory
);

router.post(
  "/create-inventory",
  protect("user"),
  permissionCheck("create_inventory"),
  InventoryController.createInventory
);

router.delete(
  "/delete-inventory/:id",
  protect("user"),
  permissionCheck("delete_inventory"),
  InventoryController.deleteInventory
);

router.post(
  "/adjust-inventory/:id",
  protect("user"),
  permissionCheck("adjust_inventory"),
  InventoryController.adjustInventory
);

router.get(
  "/inventory-kpis",
  protect("user"),
  permissionCheck("view_inventory"),
  InventoryController.getKpis
);

router.get(
  "/inventory-transaction-kpis",
  protect("user"),
  permissionCheck("view_inventory"),
  InventoryController.getInventoryTransactionKpis
);

router.get(
  "/inventory-transactions",
  protect("user"),
  permissionCheck("view_inventory"),
  InventoryController.listInventoryTransactions
);

module.exports = router;
