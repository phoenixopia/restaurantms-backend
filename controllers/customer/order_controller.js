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

exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowedStatuses = [
    "Pending",
    "InProgress",
    "Preparing",
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

  // const io = req.app.get("io");

  // io.to(`branch:${updated.branch_id}`).emit("orderStatusUpdated", {
  //   order_id: updated.id,
  //   status: updated.status,
  //   branch_id: updated.branch_id,
  //   restaurant_id: updated.restaurant_id,
  // });

  // io.to(`customer:${updated.customer_id}`).emit("customerOrderStatusUpdated", {
  //   order_id: updated.id,
  //   status: updated.status,
  // });

  return success(res, "Order status updated successfully.", updated);
});
