const asyncHandler = require("../../utils/asyncHandler");
const SubscriptionService = require("../../services/admin/subscription_service");
const { success } = require("../../utils/apiResponse");

exports.subscribe = asyncHandler(async (req, res) => {
  const receiptFile = req.file || null;

  const subscription = await SubscriptionService.subscribe(
    req.body,
    req.user,
    receiptFile
  );

  return success(res, "Subscription submitted successfully", subscription, 201);
});

exports.updateSubscriptionStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowedStatuses = [
    "active",
    "pending",
    "inactive",
    "cancelled",
    "expired",
  ];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status value.",
    });
  }

  const updated = await SubscriptionService.updateStatus(id, status);

  // req.app.locals.io
  //   .to(updated.restaurant_id)
  //   .emit("subscriptionStatusUpdated", {
  //     subscriptionId: id,
  //     newStatus: status,
  //   });

  return success(res, "Subscription status updated", updated);
});

exports.listSubscriptions = asyncHandler(async (req, res) => {
  const subscriptions = await SubscriptionService.listSubscriptions(
    req.user,
    req.query
  );
  return success(res, "Subscriptions fetched successfully", subscriptions);
});

exports.exportSubscriptionsToExcel = asyncHandler(async (req, res) => {
  const { excelBuffer, filename } = await SubscriptionService.exportToExcel(
    req.query,
    req.user
  );

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  res.send(excelBuffer);
});
