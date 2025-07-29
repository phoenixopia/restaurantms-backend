const VideoService = require("../../services/admin/video_service");
const asyncHandler = require("../../middleware/asyncHandler");
const { success } = require("../../utils/apiResponse");

exports.uploadVideo = asyncHandler(async (req, res) => {
  const video = await VideoService.uploadVideo(req.user, req.body, req.files);
  return success(res, "Video uploaded successfully", video, 201);
});

exports.updateVideo = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const updated = await VideoService.updateVideo(
    id,
    req.user,
    req.body,
    req.files
  );

  return success(res, "Video updated successfully", updated);
});

exports.deleteVideo = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deleted = await VideoService.deleteVideo(id, req.user);

  return success(res, "Video deleted successfully", deleted);
});

exports.updateVideoStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { status } = req.body;

  const allowedStatuses = ["pending", "approved", "rejected"];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status value.",
    });
  }

  const updatedVideo = await VideoService.updateVideoStatus(
    videoId,
    status,
    req.user
  );

  const io = req.app.get("io");
  io.to(updatedVideo.restaurant_id).emit("videoStatusUpdated", {
    videoId: updatedVideo.id,
    newStatus: status,
  });

  return success(res, "Video status updated", updatedVideo);
});

exports.listCustomerVideos = asyncHandler(async (req, res) => {
  const videos = await VideoService.listApprovedVideos(req.user, req.query);
  return success(res, "Videos retrieved", videos);
});

exports.viewVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const customerId = req.user?.id;

  const result = await VideoService.viewVideo(customerId, videoId);

  return success(res, result.message, result.data);
});

exports.toggleLikeVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const customerId = req.user.id;

  const result = await VideoService.toggleLike(videoId, customerId);
  return success(res, result.message, { liked: result.liked });
});

exports.toggleFavoriteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const customerId = req.user.id;

  const result = await VideoService.toggleFavorite(videoId, customerId);
  return success(res, result.message, { favorited: result.favorited });
});

exports.addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { comment } = req.body;
  const customerId = req.user.id;

  const newComment = await VideoService.addComment(
    videoId,
    customerId,
    comment
  );
  return success(res, "Comment added successfully", newComment, 201);
});

exports.updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { comment } = req.body;
  const customerId = req.user.id;

  const updatedComment = await VideoService.updateComment(
    commentId,
    customerId,
    comment
  );
  return success(res, "Comment updated successfully", updatedComment);
});

exports.deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const customerId = req.user.id;

  const result = await VideoService.deleteComment(commentId, customerId);
  return success(res, result.message, { id: commentId });
});

exports.listComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page, limit } = req.query;

  const commentsData = await VideoService.listComments(videoId, page, limit);
  return success(res, "Comments retrieved successfully", commentsData);
});
