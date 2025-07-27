const express = require("express");
const router = express.Router();
const OrderController = require("../../controllers/admin/order_controller");
const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");
const { permissionCheck } = require("../../middleware/permissionCheck");

router.get(
  "/get-all",
  protect("user"),
  permissionCheck("view_order"),
  OrderController.listOrders
);

router.get(
  "/get-order/:id",
  protect("user"),
  permissionCheck("view_order"),
  OrderController.getOrderById
);

router.put(
  "/:id/status",
  protect("user"),
  permissionCheck("edit_order"),
  OrderController.updateOrderStatus
);

module.exports = router;
