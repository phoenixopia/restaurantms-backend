const express = require("express");
const router = express.Router();

const VideoController = require("../../controllers/admin/video_controller");
const FollowerController = require("../../controllers/admin/follow_controller");
const RestaurantController = require("../../controllers/admin/restaurant_controller");

const { protect } = require("../../middleware/protect");
const optionalProtect = require("../../middleware/optionalProtect");


// Get list of videos for customers
router.get("/", optionalProtect, VideoController.listCustomerVideos);

// Get saved or favorited videos for a customer
router.get(
  "/favorites",
  protect("customer"),
  VideoController.listFavoriteVideosForCustomer
);

// Get followed restaurants for a customer
router.get(
  "/followed/restaurants/profile",
  protect("customer"),
  RestaurantController.getFollowedRestaurantsProfilesForCustomer
);

router.get(
  "/restaurants/:id/profile",
  optionalProtect,
  RestaurantController.getRestaurantProfileWithVideos
);

router.post(
  "/restaurants/:id/follow",
  protect("customer"),
  FollowerController.toggleFollow
);

router.post(
  "/videos/:videoId/views",
  protect("customer"),
  VideoController.viewVideo
);

router.post(
  "/videos/:videoId/likes",
  protect("customer"),
  VideoController.toggleLikeVideo
);

router.post(
  "/videos/:videoId/favorites",
  protect("customer"),
  VideoController.toggleFavoriteVideo
);

router.post(
  "/videos/:videoId/comments",
  protect("customer"),
  VideoController.addComment
);

router.put(
  "/comments/:commentId",
  protect("customer"),
  VideoController.updateComment
);

router.delete(
  "/comments/:commentId",
  protect("customer"),
  VideoController.deleteComment
);

router.get("/videos/:videoId/comments", VideoController.listComments);

module.exports = router;
