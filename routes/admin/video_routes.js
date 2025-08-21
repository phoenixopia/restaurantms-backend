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

// Upload a new video
router.post(
  "/upload-video",
  protect("user"),
  permissionCheck("manage_social_media"),
  uploadVideoFile,
  validateVideoThumbnailSizes,
  checkStorageQuota,
  VideoController.uploadVideo
);

// Update an existing video
router.put(
  "/update-video/:id",
  protect("user"),
  permissionCheck("edit_video"),
  uploadVideoFile,
  validateVideoThumbnailSizes,
  VideoController.updateVideo
);

// Delete a video
router.delete(
  "/delete-video/:id",
  protect("user"),
  permissionCheck("delete_video"),
  uploadVideoFile,
  validateVideoThumbnailSizes,
  VideoController.deleteVideo
);

// Approve or reject a video (super admin only)
router.patch(
  "/change-status/:videoId",
  protect("user"),
  authorize("super_admin"),
  VideoController.updateVideoStatus
);

module.exports = router;
