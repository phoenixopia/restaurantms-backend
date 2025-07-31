const asyncHandler = require("../../middleware/asyncHandler");
const { success } = require("../../utils/apiResponse");
const ArifpayService = require("../../services/admin/payment_service");
const { Order } = require("../../models");

exports.createCheckout = asyncHandler(async (req, res) => {
  const { orderId, phoneNumber } = req.body;
  const customerId = req.user.id;

  if (!orderId) {
    throwError("Order ID is required", 400);
  }

  const data = await ArifpayService.createCheckoutSession(
    orderId,
    phoneNumber,
    customerId
  );

  return success(res, "Checkout session created", data);
});

exports.handleNotification = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const notificationData = req.body;
  console.log(req.body);

  const updatedPayment = await ArifpayService.handleNotification(
    orderId,
    notificationData
  );

  if (updatedPayment?.status === "completed") {
    const order = await Order.findOne({
      where: { id: updatedPayment.order_id },
    });

    if (order) {
      const io = req.app.get("io");

      io.to(`branch:${order.branch_id}`).emit("orderStatusUpdated", {
        order_id: order.id,
        status: "InProgress",
        branch_id: order.branch_id,
        restaurant_id: order.restaurant_id,
      });

      io.to(`customer:${order.customer_id}`).emit(
        "customerOrderStatusUpdated",
        {
          order_id: order.id,
          status: "InProgress",
        }
      );
    }
  }

  return success(res, "Payment notification processed", {});
});

exports.handleCancel = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const result = await ArifpayService.cancelCheckoutSession(orderId);

  return success(res, "Cancelled", result);
});

exports.handleError = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const result = await ArifpayService.errorCheckoutSession(orderId);

  return success(res, "Cancelled", result);
});
