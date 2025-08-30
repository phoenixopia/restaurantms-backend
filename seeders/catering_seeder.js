// seeders/seed_caterings.js
"use strict";

const { v4: uuidv4 } = require("uuid");
const { Catering, Restaurant } = require("../models");

const cateringCoverImages = [
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS9OvcIK_jAgWsC61ypc8X6bhTXU4oTb_Kn-Q&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSJluVEGYWiMwbJ15E1P26vWH-DOAoX2eUCpA&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTfkJJt5-5EerqiWeIJkqteYMBEJgq7hR6GOg&s",
  "https://marketplace.canva.com/EAFhZhahkPs/1/0/1131w/canva-saddle-brown-professional-catering-menu-lQdnJVdstc4.jpg",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTezKYC3RZxneUxTYXThzS1x7EfrXmt3JM0Gw&s",
];

const cateringTitles = [
  "Premium Wedding Package",
  "Corporate Event Special",
  "Birthday Celebration Package",
  "Anniversary Dinner Service",
  "Graduation Party Package",
  "Holiday Gathering Special",
  "Family Reunion Package",
  "Cocktail Reception Service",
  "Buffet Style Gathering",
  "Formal Sit-down Dinner",
  "Casual Get-together Package",
  "Themed Party Service",
  "Gourmet Tasting Menu",
  "Brunch Celebration Package",
  "Outdoor Picnic Service",
];

const menuDescriptions = [
  "Three-course meal with appetizers, main dishes, and desserts",
  "Buffet style with a variety of international cuisines",
  "Family-style serving with shared plates",
  "Plated dinner with multiple entree options",
  "Interactive food stations with chefs",
  "Cocktail party with passed hors d'oeuvres",
  "BBQ style with grilled meats and sides",
  "Vegetarian and vegan focused menu",
  "Seafood extravaganza with fresh catches",
  "Steakhouse experience with premium cuts",
  "Italian themed with pasta and antipasti",
  "Asian fusion with sushi and stir-fry",
  "Mediterranean mezze and grilled dishes",
  "American classics with modern twists",
  "Farm-to-table seasonal offerings",
];

module.exports = async () => {
  const restaurants = await Restaurant.findAll();
  const now = new Date();

  for (const restaurant of restaurants) {
    for (let i = 0; i < cateringTitles.length; i++) {
      const coverImage =
        cateringCoverImages[
          Math.floor(Math.random() * cateringCoverImages.length)
        ];
      const title = cateringTitles[i];
      const description = menuDescriptions[i] || "Delicious catered meal";

      await Catering.create({
        id: uuidv4(),
        restaurant_id: restaurant.id,
        title,
        description,
        menu_summary: description,
        base_price: (Math.random() * 4500 + 500).toFixed(2),
        min_guest_count: Math.floor(Math.random() * 50 + 10),
        max_guest_count: Math.floor(Math.random() * 450 + 50),
        min_advance_days: Math.floor(Math.random() * 30 + 1),
        prepayment_percentage: (Math.random() * 40 + 10).toFixed(2),
        include_service: Math.random() < 0.5,
        delivery_available: Math.random() < 0.5,
        service_area_description: "Local delivery area varies",
        cover_image_url: coverImage,
        contact_person: "John Doe",
        contact_info: "+251 912 345 678",
        is_active: true,
        created_at: now,
        updated_at: now,
      });
    }
  }

  console.log("✅ Caterings seeded successfully for all restaurants");
};
