// "use strict";
// const { Restaurant, ImageGallery  } = require("../models");
// const { v4: uuidv4 } = require("uuid");

// module.exports = async () => {
//   const now = new Date();

//   const restaurantImageUrls = [
//     "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTnZdUss5DhALhw9_I6q3XotKqA7I2_GV3CzA&s",
//     "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=60",
//   ];

//   const restaurants = await Restaurant.findAll();

//   for (const restaurant of restaurants) {
//     for (let i = 0; i < 10; i++) {
//       const url = restaurantImageUrls[Math.floor(Math.random() * restaurantImageUrls.length)];
//       await ImageGallery.create({
//         id: uuidv4(),
//         restaurant_id: restaurant.id,
//         image_url: url,
//         caption: `Beautiful ${restaurant.restaurant_name} setting ${i + 1}`,
//         created_at: now,
//         updated_at: now,
//       });
//     }
//   }
// };
