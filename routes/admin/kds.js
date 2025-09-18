const express = require("express");
const router = express.Router();
const OrderController = require("../../controllers/admin/order_controller");
const { protect } = require("../../middleware/protect");
const { permissionCheck } = require("../../middleware/permissionCheck");

router.get(
  "/get-all-orders",
  protect("user"),
  // permissionCheck("view_order"),
  OrderController.listOrders
);

router.patch(
  "/update-order-status/:id",
  protect("user"),
  // permissionCheck("change_order_status"),
  OrderController.updateOrderStatus
);

router.patch(
  "/update-payment-status/:id",
  protect("user"),
  // permissionCheck("change_order_payment_status"),
  OrderController.updateOrderPaymentStatus
);

router.get(
  "/get-order-byId/:id",
  protect("user"),
  // permissionCheck("view_order"),
  OrderController.getOrderById
);

router.post(
  "/create-order",
  protect("user"),
  // permissionCheck("create_order"),
  OrderController.createOrder
);

router.delete(
  "/delete-order/:id",
  protect("user"),
  // permissionCheck("delete_order"),
  OrderController.deleteOrder
);

module.exports = router;
