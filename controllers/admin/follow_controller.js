const asyncHandler = require("../../utils/asyncHandler");
const FollowService = require("../../services/admin/follow_service");
const { success } = require("../../utils/apiResponse");

exports.toggleFollow = asyncHandler(async (req, res) => {
  const restaurant_id = req.params.id;
  const result = await FollowService.toggleFollow(req.user.id, restaurant_id);
  return success(res, result.isFollowing ? "Followed" : "Unfollowed", result);
});

exports.isFollowing = asyncHandler(async (req, res) => {
  const status = await FollowService.isFollowing(
    req.user.id,
    req.params.restaurant_id
  );
  return success(res, "Following status fetched", { isFollowing: status });
});

exports.getFollowerCount = asyncHandler(async (req, res) => {
  const count = await FollowService.getFollowerCount(req.params.restaurant_id);
  return success(res, "Follower count fetched", { count });
});
