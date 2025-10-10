const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/protect");

const PaymentController = require("../../controllers/admin/payment_controller");

router.post("/checkout", protect("customer"), PaymentController.createCheckout);
router.get("/cancel/:orderId", PaymentController.handleCancel);
router.get("/error/:orderId", PaymentController.handleError);
router.get("/success/:orderId", PaymentController.handleSuccess);
router.post("/notify/:orderId", PaymentController.handleNotification);

// // Get Payment Details by customer ID
// router.get(
//   "/customer/:customerId",
//   protect("customer"),
//   PaymentController.getPaymentsByCustomer
// );

// GET Payments by customer ID with pagination
router.get(
    "/customer/:customerId?",
    protect("customer"),
    PaymentController.getPaymentsByCustomerId
);

// GET Payments with pagination
router.get(
    "/", 
    // protect("admin"),
    PaymentController.getAllPayments
);

module.exports = router;
