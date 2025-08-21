const OrderService = require("../../services/admin/order_service");
const NotificationService = require("../../services/admin/notification_service");
const asyncHandler = require("../../utils/asyncHandler");
const { success } = require("../../utils/apiResponse");

exports.createOrder = asyncHandler(async (req, res) => {
  const io = req.app.get("io");
  const customer = req.user;

  const order = await OrderService.createOrder(req.body, customer);

  // await NotificationService.handleOrderPlacedNotification({
  //   order,
  //   customer,
  //   io,
  // });

  return success(res, "Order created successfully.", order);
});

exports.cancelOrder = asyncHandler(async (req, res) => {
  const canceled = await OrderService.cancelOrder(req.params.id, req.user);
  return success(res, "Order cancelled successfully.", canceled);
});

exports.getActiveOrders = asyncHandler(async (req, res) => {
  const customerId = req.user.id;
  const { page = 1, limit = 10 } = req.query;

  const result = await OrderService.getActiveOrders(customerId, page, limit);

  return success(res, "Active orders fetched successfully", result);
});

exports.getOrderHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const result = await OrderService.getCustomerOrderHistory(
    req.user,
    page,
    limit
  );

  return success(res, "Order history fetched successfully.", result);
});

exports.getOrderById = asyncHandler(async (req, res) => {
  const customerId = req.user.id;
  const { id: orderId } = req.params;

  const order = await OrderService.getOrderByIdForCustomer(orderId, customerId);

  return success(res, "Order fetched successfully", order);
});
