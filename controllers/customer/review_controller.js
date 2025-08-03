const ReviewService = require("../../services/admin/review_service");
const asyncHandler = require("../../utils/asyncHandler");
const { success } = require("../../utils/apiResponse");

exports.createReview = asyncHandler(async (req, res) => {
  const customerId = req.user.id;
  const review = await ReviewService.createReview(req.body, customerId);
  return success(res, "Review created successfully", review, 201);
});

exports.updateReview = asyncHandler(async (req, res) => {
  const customerId = req.user.id;
  const { id: review_id } = req.params;

  const updated = await ReviewService.updateReview(
    { review_id, ...req.body },
    customerId
  );

  return success(res, "Review updated successfully", updated);
});

exports.deleteReview = asyncHandler(async (req, res) => {
  const customerId = req.user.id;
  const { id: review_id } = req.params;

  const result = await ReviewService.deleteReview(review_id, customerId);
  return success(res, result.message, { id: review_id });
});

exports.getReviewsByRestaurant = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;
  const { page, limit } = req.query;

  const data = await ReviewService.getReviewsByRestaurant(
    restaurantId,
    parseInt(page) || 1,
    parseInt(limit) || 10
  );

  return success(res, "Reviews retrieved successfully", data);
});

exports.calculateRestaurantRating = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;

  const result = await ReviewService.calculateRestaurantRating(restaurantId);
  return success(res, "Rating calculated successfully", result);
});
