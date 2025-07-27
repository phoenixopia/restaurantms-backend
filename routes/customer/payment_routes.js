const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/protect");

const PaymentController = require("../../controllers/admin/payment_controller");

router.post("/checkout", protect("customer"), PaymentController.createCheckout);

router.post(
  "/notification",
  protect("customer"),
  PaymentController.handleNotification
);

router.delete(
  "/cancel/:sessionId",
  protect("customer"),
  PaymentController.cancelCheckout
);

module.exports = router;
