const express = require("express");
const router = express.Router();
const OrderController = require("../../controllers/customer/order_controller");
const { protect } = require("../../middleware/protect");

router.post("/create-order", protect("customer"), OrderController.createOrder);

router.put("/:id/cancel", protect("customer"), OrderController.cancelOrder);

router.get(
  "/active-orders",
  protect("customer"),
  OrderController.getActiveOrders
);

router.get(
  "/",
  protect("customer"),
  OrderController.getCustomerOrders
);

router.get(
  "/order-history",
  protect("customer"),
  OrderController.getOrderHistory
);

router.post(
  "/create",
  protect("customer"),
  // permissionCheck("create_order"),
  OrderController.createOrder
);

router.get("/with-table", protect("customer"), OrderController.getOrdersWithTableForCustomer);
// router.get("/:id", protect("customer"), OrderController.getOrderByIdForCustomer); // order detail of a customer

module.exports = router;
