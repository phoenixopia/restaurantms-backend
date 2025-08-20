const express = require("express");
const router = express.Router();
const OrderController = require("../../controllers/admin/order_controller");
const { protect } = require("../../middleware/protect");
// const { authorize } = require("../../middleware/authorize");
const { permissionCheck } = require("../../middleware/permissionCheck");

router.get(
  "/get-all-orders",
  protect("user"),
  permissionCheck("view_order"),
  OrderController.listOrders
);

router.put(
  "/update-order-status/:id",
  protect("user"),
  permissionCheck("change_order_status"),
  OrderController.updateOrderStatus
);

router.get(
  "/get-order-byId/:id",
  protect("user"),
  permissionCheck("view_order"),
  OrderController.getOrderById
);

module.exports = router;
