const CustomerOrderService = require("../../services/customer/order_service");
const NotificationService = require("../../services/admin/notification_service");
const asyncHandler = require("../../utils/asyncHandler");
const { success } = require("../../utils/apiResponse");

exports.createOrder = asyncHandler(async (req, res) => {
  const io = req.app.get("io");
  const customer = req.user;

  const order = await CustomerOrderService.createOrder(req.body, customer);

  return success(res, "Order created successfully.", order, 201);
});

exports.cancelOrder = asyncHandler(async (req, res) => {
  const canceled = await CustomerOrderService.cancelOrder(req.params.id, req.user);
  return success(res, "Order cancelled successfully.", canceled);
});


// Get all orders for a Customer
exports.getCustomerOrders = asyncHandler(async (req, res) => {
  const customerId = req.user.id;
  const { page = 1, limit = 10 } = req.query;

  const result = await CustomerOrderService.getllCustomerOrders(customerId, page, limit);

  return success(res, "Active orders fetched successfully", result);
});


// Get active orders for a Customer
exports.getActiveOrders = asyncHandler(async (req, res) => {
  const customerId = req.user.id;
  const { page = 1, limit = 10 } = req.query;

  const result = await CustomerOrderService.getActiveOrders(customerId, page, limit);

  return success(res, "Active orders fetched successfully", result);
});

exports.getOrderHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const result = await CustomerOrderService.getCustomerOrderHistory(
    req.user,
    page,
    limit
  );

  return success(res, "Order history fetched successfully.", result);
});


// Get Order by ID for a Customer
exports.getOrderByIdForCustomer = asyncHandler(async (req, res) => {
  const customerId = req.user.id;
  const { id: orderId } = req.params;

  const order = await CustomerOrderService.getOrderByIdForCustomer(orderId, customerId);

  return success(res, "Order fetched successfully", order);
});


// Get Orders with Table for Customer
exports.getOrdersWithTableForCustomer = asyncHandler(async (req, res) => {
  const customerId = req.user.id;
  const result = await CustomerOrderService.getOrdersWithTable(customerId,  req.query);
  return success(res, "Orders with table fetched successfully", result);
});