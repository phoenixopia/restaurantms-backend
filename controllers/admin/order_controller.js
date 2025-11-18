const OrderService = require("../../services/admin/order_service");
const asyncHandler = require("../../utils/asyncHandler");
const { success } = require("../../utils/apiResponse");
const throwError = require("../../utils/throwError");
const { Branch } = require ("../../models")


exports.getKitchenDisplay = asyncHandler(async (req, res) => {
  const { branchId } = req.params;   // ← From URL

  if (!branchId) {
    return res.status(400).json({
      success: false,
      message: "branchId is required in URL",
    });

  }
      const branchExists = await Branch.findByPk(branchId);
  if (!branchExists) {
    return res.status(404).json({
      success: false,
      message: "Branch not found or invalid branchId",
    });
  }

  const data = await OrderService.getKitchenDisplayOrders(branchId);

  // Auto-refresh every 10 seconds — perfect for TV
  res.setHeader("Refresh", "10");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  return success(res, "Kitchen display loaded", data);
});
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
