const {
  RestaurantFollower,
  Restaurant,
  Customer,
  Video,
  VideoLike,
  VideoComment,
  VideoView,
  VideoFavorite,
  MenuItem,
  MenuCategory,
  sequelize,
} = require("../../models");
const throwError = require("../../utils/throwError");

const FollowService = {
  async toggleFollow(customerId, restaurantId) {
    const exists = await RestaurantFollower.findOne({
      where: { customer_id: customerId, restaurant_id: restaurantId },
    });

    if (exists) {
      await exists.destroy();
      return { isFollowing: false };
    } else {
      await RestaurantFollower.create({
        customer_id: customerId,
        restaurant_id: restaurantId,
      });
      return { isFollowing: true };
    }
  },

  async isFollowing(customerId, restaurantId) {
    const exists = await RestaurantFollower.findOne({
      where: { customer_id: customerId, restaurant_id: restaurantId },
    });

    return !!exists;
  },

  async getFollowerCount(restaurantId) {
    return await RestaurantFollower.count({
      where: { restaurant_id: restaurantId },
    });
  },

  async getRestaurantStats(restaurantId) {
    const totalPosts = await Video.count({
      where: {
        restaurant_id: restaurantId,
        status: "approved",
      },
    });

    const totalLikes = await VideoLike.count({
      include: [
        {
          model: Video,

          where: {
            restaurant_id: restaurantId,
            status: "approved",
          },
        },
      ],
    });

    const totalFollowers = await RestaurantFollower.count({
      where: { restaurant_id: restaurantId },
    });

    return {
      totalPosts,
      totalLikes,
      totalFollowers,
    };
  },
};

module.exports = FollowService;
