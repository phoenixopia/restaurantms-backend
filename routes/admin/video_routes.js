const express = require("express");
const router = express.Router();

const VideoController = require("../../controllers/admin/video_controller");
const {
  uploadVideoFile,
  validateVideoThumbnailSizes,
} = require("../../middleware/videoUploadMiddleware");

const checkStorageQuota = require("../../middleware/checkStorageCapacity");
const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");
const { permissionCheck } = require("../../middleware/permissionCheck");

// ==================== SUPER ADMIN ROUTES ====================

// Approve or reject a video
router.patch(
  "/change-status/:videoId",
  protect("user"),
  authorize("super_admin"),
  VideoController.updateVideoStatus
);

// Get overview stats for all videos
router.get(
  "/stats-overview",
  protect("user"),
  authorize("super_admin"),
  VideoController.getVideoStatsOverview
);

// Get all videos (paginated, includes restaurant name & logo)
router.get(
  "/all-video",
  protect("user"),
  authorize("super_admin","restaurant_admin"),
  VideoController.getAllVideosForAdmin
);

// ==================== Admin, staffs routes ====================

// Upload a new video
router.post(
  "/upload-video",
  protect("user"),
  // permissionCheck("upload_video"),
  authorize("restaurant_admin"),
  uploadVideoFile,
  validateVideoThumbnailSizes,
  checkStorageQuota,
  VideoController.uploadVideo
);

// Update an existing video
router.put(
  "/update-video/:id",
  protect("user"),
  // permissionCheck("edit_video"),
  uploadVideoFile,
  validateVideoThumbnailSizes,
  checkStorageQuota,
  VideoController.updateVideo
);

// Delete a video
router.delete(
  "/delete-video/:id",
  protect("user"),
  // permissionCheck("delete_video"),
  VideoController.deleteVideo
);

// Get all videos for regular user (with pagination & filters)
router.get(
  "/all-videos",
  protect("user"),
  authorize("restaurant_admin"),
  // permissionCheck("view_social_media_profile"),
  VideoController.getAllVideos
);

// Get restaurant profile stats
router.get(
  "/see-profile",
  protect("user"),
  // permissionCheck("view_social_media_profile"),
  VideoController.seeProfile
);

module.exports = router;
