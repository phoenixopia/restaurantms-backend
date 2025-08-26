"use strict";

const {
  Restaurant,
  Branch,
  User,
  Role,
  MenuCategory,
  MenuItem,
  Video,
  VideoView,
  VideoLike,
  VideoFavorite,
  VideoComment,
} = require("../models");
const { v4: uuidv4 } = require("uuid");

const videoTitles = [
  "Delicious Food Experience",
  "Our Special Dish",
  "Kitchen Secrets",
  "Chef's Recommendation",
  "Customer Favorite",
];

const videoDescriptions = [
  "Check out our amazing food preparation process",
  "Our most popular dish that customers love",
  "See how our chefs create magic in the kitchen",
  "A special recommendation from our head chef",
  "This is why our customers keep coming back",
];

const videoUrls = [
  "https://youtu.be/xPPLbEFbCAo?si=bescuEhKTJU3gWwV",
  "https://youtube.com/shorts/KKw-SbklJwM?si=TK-tG0TPFMCphovA",
  "https://youtu.be/9OquUp6x5IU?si=D_cjdhL__TpIbU9-",
  "https://youtube.com/shorts/cY3qSAw71qc?si=gzDfrxGpwze6ZMRY",
  "https://youtube.com/shorts/9CfS_3ZK5FA?si=YgpGgsYHNmDyKRnJ",
];

const thumbnailUrls = [
  "https://d1csarkz8obe9u.cloudfront.net/posterpreviews/restaurant-instagram-reels-promotion-design-template-64b1fcbb3161914748df8064d291635f_screen.jpg?ts=1664733714",
  "https://media.gettyimages.com/id/1433736166/video/defocus-new-normal-bar-in-night-and-sustainability.jpg?s=640x640&k=20&c=c4Oiai0p2ETB6Xiz44HxP2VPL9jEU--JEjlPWcI6Y8Y=",
  "https://www.picmaker.com/templates/_next/image?url=https%3A%2F%2Fstatic.picmaker.com%2Fscene-prebuilts%2Fthumbnails%2FYT-0086.png&w=3840&q=75",
  "https://www.shutterstock.com/image-photo/ginger-picture-curry-recipe-bowlgarlic-260nw-2483629083.jpg",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ_h6zQdDnnf-WQsmf4ZP7bjskEG51CJEqH1g&s",
];

module.exports = async () => {
  const now = new Date();

  try {
    console.log("Starting video seeding...");

    // Ensure Restaurant Administrator role exists
    let restaurantAdminRole = await Role.findOne({
      where: { name: "Restaurant Administrator" },
    });
    if (!restaurantAdminRole) {
      throw new Error(
        "Required role 'Restaurant Administrator' not found. Please run role seeder first."
      );
    }

    const restaurants = await Restaurant.findAll({ include: [Branch] });
    const restaurantAdmins = await User.findAll({
      where: { role_id: restaurantAdminRole.id },
    });

    const menuCategories = await MenuCategory.findAll({
      include: [MenuItem, Branch],
    });

    const allVideos = [];
    const allViews = [];
    const allLikes = [];
    const allFavorites = [];
    const allComments = [];

    const commentTexts = [
      "Great video!",
      "This looks delicious!",
      "I want to try this!",
      "Amazing content!",
      "When can I order this?",
      "The chef did a great job!",
    ];

    // Seed videos
    for (const restaurant of restaurants) {
      const admin = restaurantAdmins.find(
        (a) => a.restaurant_id === restaurant.id
      );
      if (!admin) continue;

      const restaurantCategories = menuCategories.filter(
        (c) => c.restaurant_id === restaurant.id
      );

      const menuItems = [];
      for (const cat of restaurantCategories) {
        for (const item of cat.MenuItems) {
          menuItems.push({ ...item.toJSON(), branch_id: cat.branch_id });
        }
      }

      const videoCount = Math.floor(Math.random() * 2) + 2; // 2-3 videos per restaurant

      for (let i = 0; i < videoCount; i++) {
        const videoData = {
          id: uuidv4(),
          restaurant_id: restaurant.id,
          title: videoTitles[Math.floor(Math.random() * videoTitles.length)],
          description:
            videoDescriptions[
              Math.floor(Math.random() * videoDescriptions.length)
            ],
          video_url: videoUrls[Math.floor(Math.random() * videoUrls.length)],
          thumbnail_url:
            thumbnailUrls[Math.floor(Math.random() * thumbnailUrls.length)],
          duration: Math.floor(Math.random() * 120) + 30,
          status: "approved",
          uploaded_by: admin.id,
          branch_id: null,
          created_at: now,
          updated_at: now,
        };

        if (menuItems.length) {
          videoData.menu_item_id =
            menuItems[Math.floor(Math.random() * menuItems.length)].id;
        }

        allVideos.push(videoData);
      }
    }

    if (allVideos.length) {
      const createdVideos = await Video.bulkCreate(allVideos);
      console.log(`Created ${createdVideos.length} videos`);
    }

    console.log("✅ Video seeding completed successfully!");
  } catch (err) {
    console.error("❌ Error seeding videos:", err);
    throw err;
  }
};
