const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/protect");

const PaymentController = require("../../controllers/admin/payment_controller");

router.post("/checkout", protect("customer"), PaymentController.createCheckout);
router.get("/cancel/:orderId", PaymentController.handleCancel);
router.get("/error/:orderId", PaymentController.handleError);
router.get("/success/:orderId", PaymentController.handleSuccess);
router.post("/notify/:orderId", PaymentController.handleNotification);

module.exports = router;
