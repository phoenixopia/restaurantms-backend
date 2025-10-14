const express = require("express");
const router = express.Router();
const ReviewController = require("../../controllers/customer/review_controller");
const { protect } = require("../../middleware/protect");
const { permissionCheck } = require("../../middleware/permissionCheck");

router.get(
  "/see-review",
  protect("user"),
  // permissionCheck("see_review_rating"),
  ReviewController.getReview
);

router.get(
  "/see-review-rating",
  protect("user"),
  // permissionCheck("see_review_rating"),
  ReviewController.seeTotalCaluclatedRating
);

module.exports = router;
