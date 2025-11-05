const VideoService = require("../../services/admin/video_service");
const asyncHandler = require("../../utils/asyncHandler");
const { success } = require("../../utils/apiResponse");
const logActivity = require("../../utils/logActivity");

// ==================== SUPER ADMIN CONTROLLERS ====================



exports.getAllVideosForAdmin = asyncHandler(async (req, res) => {
  const filters = {
    page: parseInt(req.query.page, 10) || 1,
    limit: parseInt(req.query.limit, 10) || 10,
    title: req.query.title?.trim(),
    status: req.query.status,
    date: req.query.date,
    branch_id: req.query.branch_id,
    menu_item_id: req.query.menu_item_id,
    sortBy: req.query.sortBy,
    sortOrder: req.query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC',
    restaurant_name: req.query.restaurant_name?.trim(), // ← NEW!
  };

  const result = await VideoService.getAllVideosForAdmin(req.user, filters);
  return success(res, 'Videos fetched successfully', result);
});

// Get video system stats overview
exports.getVideoStatsOverview = asyncHandler(async (req, res) => {
  const stats = await VideoService.getVideoStatsOverview();
  return success(res, "Video system stats fetched successfully", stats);
});

// Approve or reject a video
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

  return success(res, "Video status updated", updatedVideo);
});

// ==================== Admins CONTROLLERS ====================

// Upload a new video
exports.uploadVideo = asyncHandler(async (req, res) => {
  const video = await VideoService.uploadVideo(req.user, req.body, req.files);
  return success(res, "Video uploaded successfully", video, 201);
});

// Update an existing video
exports.updateVideo = asyncHandler(async (req, res) => {
  const updated = await VideoService.updateVideo(
    req.user,
    req.params.id,
    req.body,
    req.files
  );
  return success(res, "Video updated successfully", updated);
});

// Delete a video
exports.deleteVideo = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await VideoService.deleteVideo(id, req.user);
  return success(res, "Video deleted successfully", deleted);
});

// Get all videos (regular user, paginated + filters)
exports.getAllVideos = asyncHandler(async (req, res) => {
  const filters = {
    page: req.query.page || 1,
    limit: req.query.limit || 10,
    title: req.query.title,
    date: req.query.date,
    status: req.query.status,
    sortBy: req.query.sortBy,
    branch_id: req.query.branch_id,
  };
  const videos = await VideoService.getAllVideos(req.user, filters);
  return success(res, "Videos fetched successfully", videos);
});

// Get restaurant profile stats
exports.seeProfile = asyncHandler(async (req, res) => {
  const profileData = await VideoService.getProfileData(req.user);
  return success(res, "Profile data fetched successfully", profileData);
});

// ==================== VIDEO INTERACTIONS ====================

// List approved videos for customer
exports.listCustomerVideos = asyncHandler(async (req, res) => {
  const videos = await VideoService.listApprovedVideos(req.user, req.query);
  return success(res, "Videos retrieved", videos);
});

// List favorited videos for customer
exports.listFavoriteVideosForCustomer = asyncHandler(async (req, res) => {
  const favoritesData = await VideoService.listFavoritedVideos(req.user.id, req.query);
  return success(res, "Favorited videos retrieved successfully.", favoritesData);
});

// View a video
exports.viewVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const customerId = req.user?.id;
  const result = await VideoService.viewVideo(customerId, videoId);
  return success(res, result.message, result.data);
});

// Toggle like
exports.toggleLikeVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const customerId = req.user.id;
  const result = await VideoService.toggleLike(videoId, customerId);
  return success(res, result.message, { liked: result.liked });
});

// Toggle favorite
exports.toggleFavoriteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const customerId = req.user.id;
  const result = await VideoService.toggleFavorite(videoId, customerId);
  return success(res, result.message, { favorited: result.favorited });
});

// ==================== COMMENTS ====================

// Add comment
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

// Update comment
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

// Delete comment
exports.deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const customerId = req.user.id;
  const result = await VideoService.deleteComment(commentId, customerId);
  return success(res, result.message, { id: commentId });
});

// List comments
exports.listComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page, limit } = req.query;
  const commentsData = await VideoService.listComments(videoId, page, limit);
  return success(res, "Comments retrieved successfully", commentsData);
});
