"use strict";

const { v4: uuidv4 } = require("uuid");
const {
  Menu,
  MenuCategory,
  MenuItem,
  Restaurant,
  Branch,
  CategoryTag,
  MenuCategoryTags,
} = require("../models");

module.exports = async () => {
  const now = new Date();
  try {
    console.log("🌱 Starting menu categories & items seeding...");
    const restaurants = await Restaurant.findAll({
      include: [{ model: Branch }, { model: Menu }],
    });

    console.log(`Found ${restaurants.length} restaurants`);
    if (restaurants.length > 0) {
      console.log(
        "First restaurant branches:",
        restaurants[0].Branches ? restaurants[0].Branches.length : 0
      );
    }

    // Fetch category tags once
    const categoryTags = await CategoryTag.findAll();

    const getRandomTags = () => {
      if (categoryTags.length === 0) return [];
      const shuffled = [...categoryTags].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, Math.floor(Math.random() * 2) + 2);
    };

    // Predefined menu categories & items
    const menuData = [
      {
        category: "Appetizers",
        items: [
          "Spring Rolls",
          "Garlic Bread",
          "Bruschetta",
          "Stuffed Mushrooms",
          "Buffalo Wings",
          "Mozzarella Sticks",
          "Potato Skins",
          "Deviled Eggs",
          "Nachos",
          "Onion Rings",
          "Mini Quiches",
        ],
      },
      {
        category: "Salads",
        items: [
          "Caesar Salad",
          "Greek Salad",
          "Cobb Salad",
          "Caprese Salad",
          "Garden Salad",
          "Spinach & Strawberry Salad",
          "Kale & Quinoa Salad",
          "Asian Chicken Salad",
          "Nicoise Salad",
          "Waldorf Salad",
          "Pasta Salad",
        ],
      },
      {
        category: "Soups",
        items: [
          "Tomato Basil Soup",
          "Chicken Noodle Soup",
          "French Onion Soup",
          "Minestrone",
          "Clam Chowder",
          "Butternut Squash Soup",
          "Lentil Soup",
          "Broccoli Cheddar Soup",
          "Pumpkin Soup",
          "Beef Barley Soup",
          "Vegetable Soup",
        ],
      },
    ];

    // Food images (rotated between items)
    const foodImages = [
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQMFUQWUr_5SKpmX24mZIWpQAYKj5iCJ9p7fA&s",
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT-coO6G2IuI734BMaQkhQk0NrYguFtEhJ8dw&s",
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQngrxUh-xvZjTxQr_j_MsyId9dxEZtaZPZvA&s",
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT2o86IDNmk8t6E2yl-5LPK401pby8B2BX0Vg&s",
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ_h6zQdDnnf-WQsmf4ZP7bjskEG51CJEqH1g&s",
    ];

    // Iterate over restaurants
    for (let i = 0; i < restaurants.length; i++) {
      const restaurant = restaurants[i];
      console.log(
        `Processing restaurant ${i + 1}/${restaurants.length}: ${
          restaurant.restaurant_name
        }`
      );

      const menu = await Menu.findOne({
        where: { restaurant_id: restaurant.id },
      });

      if (!menu) {
        console.warn(
          `⚠️ No menu found for ${restaurant.restaurant_name}, skipping...`
        );
        continue;
      }

      // Process branches
      for (let j = 0; j < restaurant.Branches.length; j++) {
        const branch = restaurant.Branches[j];
        console.log(
          `  Processing branch ${j + 1}/${restaurant.Branches.length}: ${
            branch.name
          }`
        );

        // Process categories
        for (let k = 0; k < menuData.length; k++) {
          const categoryData = menuData[k];

          const menuCategory = await MenuCategory.create({
            id: uuidv4(),
            restaurant_id: restaurant.id,
            branch_id: branch.id,
            menu_id: menu.id,
            name: categoryData.category,
            description: `Delicious ${categoryData.category}`,
            sort_order: k + 1,
            is_active: true,
            created_at: now,
            updated_at: now,
          });

          // Assign random tags if available
          const randomTags = getRandomTags();
          if (randomTags.length > 0) {
            await Promise.all(
              randomTags.map((tag) =>
                MenuCategoryTags.create({
                  menu_category_id: menuCategory.id,
                  category_tag_id: tag.id,
                  created_at: now,
                  updated_at: now,
                })
              )
            );
          }

          // Insert items in small batches to reduce DB pressure
          const itemBatchSize = 5;
          for (let l = 0; l < categoryData.items.length; l += itemBatchSize) {
            const batch = categoryData.items.slice(l, l + itemBatchSize);
            await Promise.all(
              batch.map((item, index) =>
                MenuItem.create({
                  id: uuidv4(),
                  menu_category_id: menuCategory.id,
                  name: item,
                  description: `Tasty ${item}`,
                  unit_price: (Math.random() * 4 + 1).toFixed(2),
                  image: foodImages[(l + index) % foodImages.length],
                  is_active: true,
                  seasonal: false,
                  created_at: now,
                  updated_at: now,
                })
              )
            );

            // Small delay between batches
            if (l + itemBatchSize < categoryData.items.length) {
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
          }
        }
      }

      // Delay between restaurants
      if (i < restaurants.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log("✅ Seeding finished! Categories, items, and tags created.");
  } catch (error) {
    console.error("❌ Error seeding menu categories and items:", error);
    throw error;
  }
};
