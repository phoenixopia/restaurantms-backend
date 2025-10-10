const express = require("express");
const router = express.Router();
const OrderController = require("../../controllers/customer/order_controller");
const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");
const { permissionCheck } = require("../../middleware/permissionCheck");

router.post("/create-order", protect("customer"), OrderController.createOrder);

router.put("/:id/cancel", protect("customer"), OrderController.cancelOrder);

router.get(
  "/active-orders",
  protect("customer"),
  OrderController.getActiveOrders
);

router.get(
  "/order-history",
  protect("customer"),
  OrderController.getOrderHistory
);

router.get("/:id/order", protect("customer"), OrderController.getOrderById);
router.get("/with-table/:customerId?", protect("customer"), OrderController.getOrdersWithTableForCustomer);

module.exports = router;
