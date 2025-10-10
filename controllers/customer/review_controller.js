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

// Get Reviews by Restaurant
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


// Get Review for a Customer user
exports.getReviewsByCustomerUser = asyncHandler(async (req, res) => {
  const customerId = req.user.id || req.params.id;
  const { page, limit } = req.query;

  const data = await ReviewService.getReviewsByCustomerUser(
    customerId,
    parseInt(page) || 1,
    parseInt(limit) || 10
  );

  return success(res, "Reviews retrieved successfully", data);
});


exports.getReview = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;

  const data = await ReviewService.getReview(
    req.user,
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

exports.seeTotalCaluclatedRating = asyncHandler(async (req, res) => {
  const result = await ReviewService.seeTotalCaluclatedRating(req.user);
  return success(res, "Rating calculated successfully", result);
});
