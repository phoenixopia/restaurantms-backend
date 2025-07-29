const asyncHandler = require("../../middleware/asyncHandler");
const { success } = require("../../utils/apiResponse");
const ArifpayService = require("../../services/admin/payment_service");
const { Order, KdsOrder } = require("../../models");

exports.createCheckout = asyncHandler(async (req, res) => {
  const { order, customer } = req.body;

  const data = await ArifpayService.createCheckoutSession(order, customer);

  return success("Checkout session created", data, res);
});

exports.handleNotification = asyncHandler(async (req, res) => {
  const notificationData = req.body;

  const updatedPayment = await ArifpayService.handleNotification(
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

  return success("Payment notification processed", {}, res);
});

exports.cancelCheckout = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const result = await ArifpayService.cancelCheckoutSession(sessionId);

  return success("Checkout session cancelled", result, res);
});
