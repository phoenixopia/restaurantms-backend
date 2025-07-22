const express = require("express");
const router = express.Router();
const VideoController = require("../../controllers/admin/video_controller");

const { protect } = require("../../middleware/protect");

router.get("/", VideoController.listCustomerVideos);

// Track video as viewed (called while watching)
router.post("/:videoId/views", protect("customer"), VideoController.viewVideo);

// Like/unlike a video (toggle)
router.post(
  "/:videoId/likes",
  protect("customer"),
  VideoController.toggleLikeVideo
);

// Favorite/unfavorite a video (toggle)
router.post(
  "/:videoId/favorites",
  protect("customer"),
  VideoController.toggleFavoriteVideo
);

// Comments routes
router.post(
  "/:videoId/comments",
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
router.get("/:videoId/comments", VideoController.listComments);

module.exports = router;
