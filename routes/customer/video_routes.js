const express = require("express");
const router = express.Router();

const VideoController = require("../../controllers/admin/video_controller");
const FollowerController = require("../../controllers/admin/follow_controller");
const RestaurantController = require("../../controllers/admin/restaurant_controller");

const { protect } = require("../../middleware/protect");
const optionalProtect = require("../../middleware/optionalProtect");

// ===========================
// 🔹 Restaurant Public Routes
// ===========================

// Get customer-visible video list (e.g. Explore / Home Feed)
router.get("/", optionalProtect, VideoController.listCustomerVideos);

// Get full restaurant profile with stats & videos
router.get(
  "/restaurants/:id/profile",
  optionalProtect,
  RestaurantController.getRestaurantProfileWithVideos
);

// Follow/Unfollow a restaurant (toggle)
router.post(
  "/restaurants/:id/follow",
  protect("customer"),
  FollowerController.toggleFollow
);

// ===========================
// 🔹 Video Interaction Routes
// ===========================

// Track a video view (used when video is played)
router.post(
  "/videos/:videoId/views",
  protect("customer"),
  VideoController.viewVideo
);

// Like/Unlike a video (toggle)
router.post(
  "/videos/:videoId/likes",
  protect("customer"),
  VideoController.toggleLikeVideo
);

// Favorite/Unfavorite a video (toggle)
router.post(
  "/videos/:videoId/favorites",
  protect("customer"),
  VideoController.toggleFavoriteVideo
);

// ===========================
// 🔹 Video Comment Routes
// ===========================

// Add a comment to a video
router.post(
  "/videos/:videoId/comments",
  protect("customer"),
  VideoController.addComment
);

// Update a comment
router.put(
  "/comments/:commentId",
  protect("customer"),
  VideoController.updateComment
);

// Delete a comment
router.delete(
  "/comments/:commentId",
  protect("customer"),
  VideoController.deleteComment
);

// Get comments for a video
router.get("/videos/:videoId/comments", VideoController.listComments);

module.exports = router;
