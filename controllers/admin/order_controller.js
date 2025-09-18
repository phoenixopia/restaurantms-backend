const OrderService = require("../../services/admin/order_service");
const asyncHandler = require("../../utils/asyncHandler");
const { success } = require("../../utils/apiResponse");
const throwError = require("../../utils/throwError");

exports.listOrders = asyncHandler(async (req, res) => {
  const orders = await OrderService.listOrders(req.query, req.user);
  return success(res, "Orders fetched successfully.", orders);
});

exports.getOrderById = asyncHandler(async (req, res) => {
  const order = await OrderService.getSingleOrder(req.params.id, req.user);
  return success(res, "Order fetched successfully.", order);
});

exports.createOrder = asyncHandler(async (req, res) => {
  const order = await OrderService.createOrderByAdmin(req.body, req.user);
  return success(res, "Order created successfully", order, 201);
});

exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowedStatuses = [
    "Pending",
    "InProgress",
    "Ready",
    "Served",
    "Cancelled",
  ];

  if (!allowedStatuses.includes(status)) {
    throwError("Invalid KDS order status.", 400);
  }

  const updated = await OrderService.updateOrderStatus(
    req.params.id,
    status,
    req.user
  );

  return success(res, "Order status updated successfully.", updated);
});

exports.updateOrderPaymentStatus = asyncHandler(async (req, res) => {
  const { payment_status } = req.body;
  const allowedStatuses = ["Paid", "Unpaid"];
  if (!allowedStatuses.includes(payment_status)) {
    throwError("Invalid payment status.", 400);
  }
  const updated = await OrderService.updateOrderPaymentStatus(
    req.params.id,
    payment_status,
    req.user
  );
  return success(res, "Order payment status updated successfully.", updated);
});

exports.deleteOrder = asyncHandler(async (req, res) => {
  const deleted = await OrderService.deleteOrder(req.params.id, req.user);
  return success(res, "Order deleted successfully.", deleted);
});
