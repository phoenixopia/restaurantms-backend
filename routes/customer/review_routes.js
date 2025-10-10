const express = require("express");
const router = express.Router();
const ReviewController = require("../../controllers/customer/review_controller");
const { protect } = require("../../middleware/protect");

router.post(
  "/create-review",
  protect("customer"),
  ReviewController.createReview
);
router.put(
  "/edit-review/:id",
  protect("customer"),
  ReviewController.updateReview
);

router.delete(
  "/delete-review/:id",
  protect("customer"),
  ReviewController.deleteReview
);

router.get(
  "/restaurant/:restaurantId",
  ReviewController.getReviewsByRestaurant
);

router.get(
  "/:customerId",
  ReviewController.getReviewsByCustomerUser
);

router.get(
  "/see/:restaurantId/rating",
  ReviewController.calculateRestaurantRating
);

module.exports = router;
