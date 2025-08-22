"use strict";

const { Restaurant,Branch, User, Role,MenuCategory,MenuItem,Video,VideoView, VideoLike,VideoFavorite, VideoComment,Customer } = require("../models");
const { v4: uuidv4 } = require("uuid");

module.exports = async () => {
  const now = new Date();

  const videoTitles = [
    "Delicious Food Experience",
    "Our Special Dish",
    "Kitchen Secrets",
    "Chef's Recommendation",
    "Customer Favorite",
    "New Menu Item",
    "Behind the Scenes",
    "Food Preparation",
    "Tasty Bites",
    "Special Offer",
  ];

  const videoDescriptions = [
    "Check out our amazing food preparation process",
    "Our most popular dish that customers love",
    "See how our chefs create magic in the kitchen",
    "A special recommendation from our head chef",
    "This is why our customers keep coming back",
    "Introducing our newest menu addition",
    "Exclusive behind-the-scenes look at our restaurant",
    "Watch how we prepare this delicious meal",
    "Tasty bites that will make your mouth water",
    "Special offer just for our loyal customers",
  ];

  const videoUrls = [
    "https://youtu.be/xPPLbEFbCAo?si=bescuEhKTJU3gWwV",
    "https://youtube.com/shorts/KKw-SbklJwM?si=TK-tG0TPFMCphovA",
    "https://youtu.be/9OquUp6x5IU?si=D_cjdhL__TpIbU9-",
    "https://youtube.com/shorts/cY3qSAw71qc?si=gzDfrxGpwze6ZMRY",
    "https://youtube.com/shorts/9CfS_3ZK5FA?si=YgpGgsYHNmDyKRnJ",
    "https://youtube.com/shorts/Qbg25VhgB1I?si=91m4duurEGZgwqet",
    "https://youtube.com/shorts/GaU2og5snfk?si=7rIuZXlEEf7Ydp65",
    "https://youtube.com/shorts/Dlj3OpLJg8w?si=p0Lzs6v3VFWR_NyB",
    "https://youtube.com/shorts/Cyahmutl3uI?si=b-xPJVlJ3KrUfOML",
    "https://youtube.com/shorts/Dlj3OpLJg8w?si=N91rwOwrJW5NNO8r",
  ];

  const thumbnailUrls = [
    "https://d1csarkz8obe9u.cloudfront.net/posterpreviews/restaurant-instagram-reels-promotion-design-template-64b1fcbb3161914748df8064d291635f_screen.jpg?ts=1664733714",
    "https://media.gettyimages.com/id/1433736166/video/defocus-new-normal-bar-in-night-and-sustainability.jpg?s=640x640",
    "https://static.picmaker.com/scene-prebuilts/thumbnails/YT-0086.png",
    "https://www.shutterstock.com/image-photo/ginger-picture-curry-recipe-bowlgarlic-260nw-2483629083.jpg",
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ_h6zQdDnnf-WQsmf4ZP7bjskEG51CJEqH1g",
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQMFUQWUr_5SKpmX24mZIWpQAYKj5iCJ9p7fA",
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQngrxUh-xvZjTxQr_j_MsyId9dxEZtaZPZvA",
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQngrxUh-xvZjTxQr_j_MsyId9dxEZtaZPZvA",
    "https://www.shutterstock.com/image-photo/ginger-picture-curry-recipe-bowlgarlic-260nw-2483629083.jpg",
    "https://www.shutterstock.com/image-photo/ginger-picture-curry-recipe-bowlgarlic-260nw-2483629083.jpg",
  ];

  try {
    // Roles
    const restaurantAdminRole = await Role.findOne({ where: { name: "restaurant_admin" } });
    const staffRole = await Role.findOne({ where: { name: "staff" } });

    const restaurants = await Restaurant.findAll({ include: [Branch] });
    const restaurantAdmins = await User.findAll({ where: { role_id: restaurantAdminRole.id } });
    const staffMembers = await User.findAll({ where: { role_id: staffRole.id } });
    const menuCategories = await MenuCategory.findAll({ include: [MenuItem, Branch] });
    const customers = await Customer.findAll();

    for (const restaurant of restaurants) {
      const restaurantAdmin = restaurantAdmins.find(admin => admin.restaurant_id === restaurant.id);
      if (!restaurantAdmin) continue;

      const restaurantStaff = staffMembers.filter(staff =>
        restaurant.Branches.some(branch => branch.id === staff.branch_id)
      );
      if (restaurantStaff.length === 0) continue;

      const restaurantMenuCategories = menuCategories.filter(cat => cat.restaurant_id === restaurant.id);

      // Flatten menu items per branch
      const menuItems = [];
      for (const cat of restaurantMenuCategories) {
        for (const item of cat.MenuItems) {
          menuItems.push({ ...item.toJSON(), branch_id: cat.branch_id });
        }
      }

      const videos = [];
      for (let i = 0; i < 5; i++) {
        const videoData = {
          id: uuidv4(),
          restaurant_id: restaurant.id,
          title: videoTitles[Math.floor(Math.random() * videoTitles.length)],
          description: videoDescriptions[Math.floor(Math.random() * videoDescriptions.length)],
          video_url: videoUrls[Math.floor(Math.random() * videoUrls.length)],
          thumbnail_url: thumbnailUrls[Math.floor(Math.random() * thumbnailUrls.length)],
          duration: Math.floor(Math.random() * 120) + 30,
          status: "approved",
          created_at: now,
          updated_at: now,
        };

        if (i < 2) {
          videoData.uploaded_by = restaurantAdmin.id;
          videoData.branch_id = null;
        } else {
          const staffMember = restaurantStaff[(i - 2) % restaurantStaff.length];
          videoData.uploaded_by = staffMember.id;
          videoData.branch_id = staffMember.branch_id;

          // Attach random menu item
          const branchMenuItems = menuItems.filter(mi => mi.branch_id === staffMember.branch_id);
          if (branchMenuItems.length > 0) {
            videoData.menu_item_id = branchMenuItems[Math.floor(Math.random() * branchMenuItems.length)].id;
          }
        }

        videos.push(videoData);
      }

      const createdVideos = await Video.bulkCreate(videos);

      // 🎬 Add interactions
      for (const video of createdVideos) {
        const views = [];
        const likes = [];
        const favorites = [];
        const comments = [];

        const shuffledCustomers = [...customers].sort(() => 0.5 - Math.random());
        const interactingCustomers = shuffledCustomers.slice(0, Math.floor(Math.random() * 16) + 5);

        for (const customer of interactingCustomers) {
          views.push({ id: uuidv4(), video_id: video.id, customer_id: customer.id, created_at: now });

          if (Math.random() < 0.7)
            likes.push({ id: uuidv4(), video_id: video.id, customer_id: customer.id, created_at: now });

          if (Math.random() < 0.3)
            favorites.push({ id: uuidv4(), video_id: video.id, customer_id: customer.id, created_at: now });

          if (Math.random() < 0.4) {
            const commentsPool = [
              "Great video!",
              "This looks delicious!",
              "I want to try this!",
              "Amazing content!",
              "When can I order this?",
              "The chef did a great job!",
              "This is my favorite dish!",
              "The presentation is beautiful!",
              "I can't wait to visit!",
              "The food looks so fresh!",
            ];
            comments.push({
              id: uuidv4(),
              video_id: video.id,
              customer_id: customer.id,
              comment_text: commentsPool[Math.floor(Math.random() * commentsPool.length)],
              created_at: now,
              updated_at: now,
            });
          }
        }

        await Promise.all([
          VideoView.bulkCreate(views, { ignoreDuplicates: true }),
          VideoLike.bulkCreate(likes, { ignoreDuplicates: true }),
          VideoFavorite.bulkCreate(favorites, { ignoreDuplicates: true }),
          VideoComment.bulkCreate(comments, { ignoreDuplicates: true }),
        ]);
      }
    }

    console.log("✅ Video seeding completed successfully");
  } catch (error) {
    console.error("❌ Video seeding failed:", error);
    throw error;
  }
};
