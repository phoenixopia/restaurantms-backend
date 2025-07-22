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

// ================================
// 🔹 Admin Video Management Routes
// ================================

// Upload a new video
router.post(
  "/videos",
  protect("user"),
  permissionCheck("upload_video"),
  uploadVideoFile,
  validateVideoThumbnailSizes,
  VideoController.uploadVideo
);

// Update an existing video
router.put(
  "/videos/:id",
  protect("user"),
  permissionCheck("edit_video"),
  uploadVideoFile,
  validateVideoThumbnailSizes,
  VideoController.updateVideo
);

// Delete a video
router.delete(
  "/videos/:id",
  protect("user"),
  permissionCheck("delete_video"),
  uploadVideoFile,
  validateVideoThumbnailSizes,
  VideoController.deleteVideo
);

// Approve or reject a video (super admin only)
router.patch(
  "/videos/:videoId/status",
  protect("user"),
  authorize("super_admin"),
  VideoController.updateVideoStatus
);

module.exports = router;
