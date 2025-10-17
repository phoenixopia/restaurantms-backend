"use strict";

const {
  RestaurantFollower,
  Restaurant,
  Customer,
  Video,
  VideoView,
  VideoLike,
  VideoFavorite,
  VideoComment,
} = require("../models");
const { v4: uuidv4 } = require("uuid");

module.exports = async () => {
  console.log("🚀 Starting followers & video interactions seeding...");
  const now = new Date();

  try {
    // --- Get base data
    const restaurants = await Restaurant.findAll();
    const customers = await Customer.findAll();
    const videos = await Video.findAll();

    if (!restaurants.length || !customers.length || !videos.length) {
      throw new Error("❌ Missing base data (restaurants/customers/videos). Please seed those first.");
    }

    // --- Restaurant Followers
    const followers = [];
    for (const restaurant of restaurants) {
      const followerCount = Math.floor(Math.random() * 4) + 2; // 2-5 followers
      const randomCustomers = customers.sort(() => 0.5 - Math.random()).slice(0, followerCount);

      for (const cust of randomCustomers) {
        followers.push({
          id: uuidv4(),
          restaurant_id: restaurant.id,
          customer_id: cust.id,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    await RestaurantFollower.bulkCreate(followers, { ignoreDuplicates: true });
    console.log(`✅ Created ${followers.length} restaurant followers`);

    // --- Video Interactions
    const views = [];
    const likes = [];
    const favorites = [];
    const comments = [];

    const commentTexts = [
      "Amazing video!",
      "Looks delicious 😋",
      "I have to visit this restaurant!",
      "Chef nailed it!",
      "Love this dish!",
      "Where can I order this?",
      "Awesome content!",
    ];

    for (const video of videos) {
      const randomViewers = customers.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 6) + 2); // 2–7 viewers

      for (const cust of randomViewers) {
        const viewedAt = new Date(now.getTime() - Math.floor(Math.random() * 86400000)); // within 1 day

        // View
        views.push({
          id: uuidv4(),
          video_id: video.id,
          customer_id: cust.id,
          createdAt: viewedAt,
        });

        // Random like
        if (Math.random() < 0.6) {
          likes.push({
            id: uuidv4(),
            video_id: video.id,
            customer_id: cust.id,
            createdAt: viewedAt,
          });
        }

        // Random favorite
        if (Math.random() < 0.3) {
          favorites.push({
            id: uuidv4(),
            video_id: video.id,
            customer_id: cust.id,
            createdAt: viewedAt,
          });
        }

        // Random comment
        if (Math.random() < 0.4) {
          comments.push({
            id: uuidv4(),
            video_id: video.id,
            customer_id: cust.id,
            comment_text: commentTexts[Math.floor(Math.random() * commentTexts.length)],
            createdAt: viewedAt,
            updatedAt: viewedAt,
          });
        }
      }
    }

    if (views.length) await VideoView.bulkCreate(views, { ignoreDuplicates: true });
    if (likes.length) await VideoLike.bulkCreate(likes);
    if (favorites.length) await VideoFavorite.bulkCreate(favorites);
    if (comments.length) await VideoComment.bulkCreate(comments);

    console.log(`✅ Created ${views.length} views, ${likes.length} likes, ${favorites.length} favorites, ${comments.length} comments`);
    console.log("🎉 Followers & video interactions seeding completed successfully!");
  } catch (err) {
    console.error("❌ Error seeding followers/interactions:", err);
    throw err;
  }
};
