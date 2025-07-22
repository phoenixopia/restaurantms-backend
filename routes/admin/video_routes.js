const express = require("express");
const router = express.Router();
const VideoController = require("../../controllers/admin/video_controller");
const {
  uploadVideoFile,
  validateVideoThumbnailSizes,
} = require("../../middleware/videoUploadMiddleware");
const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");
const { permissionCheck } = require("../../middleware/permissionCheck");

// Upload video . . . . . . . . add permission upload_video
router.post(
  "/upload",
  protect("user"),
  permissionCheck("upload_video"),
  uploadVideoFile,
  validateVideoThumbnailSizes,
  VideoController.uploadVideo
);

router.put(
  "/update-video/:id",
  protect("user"),
  permissionCheck("edit_video"),
  uploadVideoFile,
  validateVideoThumbnailSizes,
  VideoController.updateVideo
);

router.put(
  "/update-video/:id",
  protect("user"),
  permissionCheck("delete_video"),
  uploadVideoFile,
  validateVideoThumbnailSizes,
  VideoController.deleteVideo
);

// Approve or reject video (super admin only)
router.patch(
  "/:videoId/status",
  protect("user"),
  authorize("super_admin"),
  VideoController.updateVideoStatus
);

// Get all approved videos (for customer)
router.get("/customer/list", protect, VideoController.listCustomerVideos);

// // Like, comment, favorite
// router.post("/:videoId/like", protect, VideoController.likeVideo);
// router.post("/:videoId/comment", protect, VideoController.commentVideo);
// router.post("/:videoId/favorite", protect, VideoController.favoriteVideo);

// // Track view
// router.post("/:videoId/view", protect, VideoController.viewVideo);

// // Optional: Get my favorites
// router.get("/favorites", protect, VideoController.getFavorites);

module.exports = router;
