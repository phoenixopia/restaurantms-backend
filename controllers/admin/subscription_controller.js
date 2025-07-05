const asyncHandler = require("../../middleware/asyncHandler");
const SubscriptionService = require("../../services/admin/subscription_service");
const { success } = require("../../utils/apiResponse");

exports.subscribe = asyncHandler(async (req, res) => {
  const subscription = await SubscriptionService.create(req.body, req.user?.id);
  return success(res, "Subscribed Successfully", subscription);
});
