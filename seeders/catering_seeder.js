// "use strict";

// const { Video, VideoInteraction, Branch, Customer } = require("../models");
// const { v4: uuidv4 } = require("uuid");

// module.exports = async () => {
//   const now = new Date();

//   const branches = await Branch.findAll();
//   const customers = await Customer.findAll();

//   for (const branch of branches) {
//     const video = await Video.create({
//       id: uuidv4(),
//       branch_id: branch.id,
//       url: "https://www.w3schools.com/html/mov_bbb.mp4",
//       title: `${branch.name} Promo`,
//       created_at: now,
//       updated_at: now,
//     });

//     // Add interactions from customers
//     for (const customer of customers) {
//       await VideoInteraction.create({
//         id: uuidv4(),
//         video_id: video.id,
//         customer_id: customer.id,
//         type: "view", // can also add "like", "favorite", "comment"
//         created_at: now,
//         updated_at: now,
//       });
//     }
//   }
// };


"use strict";
const { Restaurant, Catering, ImageGallery } = require("../models");
const { v4: uuidv4 } = require("uuid");

module.exports = async () => {
  const now = new Date();

  const cateringCovers = [
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS9OvcIK_jAgWsC61ypc8X6bhTXU4oTb_Kn-Q&s",
    "https://marketplace.canva.com/EAFhZhahkPs/1/0/1131w/canva-saddle-brown-professional-catering-menu-lQdnJVdstc4.jpg",
  ];

  const titles = ["Premium Wedding Package", "Corporate Event Special", "Birthday Celebration Package"];
  const descriptions = ["Three-course meal", "Buffet style", "Family style"];

  const restaurants = await Restaurant.findAll();

  for (const restaurant of restaurants) {
    for (let i = 0; i < titles.length; i++) {
      const cover = cateringCovers[Math.floor(Math.random() * cateringCovers.length)];
      await Catering.create({
        id: uuidv4(),
        restaurant_id: restaurant.id,
        title: titles[i],
        description: `Our catering for ${titles[i].toLowerCase()}`,
        menu_summary: descriptions[i],
        base_price: (Math.random() * 2000 + 500).toFixed(2),
        cover_image_url: cover,
        is_active: true,
        created_at: now,
        updated_at: now,
      });
    }
  }
};
