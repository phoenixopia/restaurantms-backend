"use strict";
const { Menu, MenuCategory, MenuItem, Branch, CategoryTag, Restaurant } = require("../models/index");
const { v4: uuidv4 } = require("uuid");

module.exports = async () => {
  const now = new Date();

  const foodImages = [
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQMFUQWUr_5SKpmX24mZIWpQAYKj5iCJ9p7fA&s",
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT-coO6G2IuI734BMaQkhQk0NrYguFtEhJ8dw&s",
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQngrxUh-xvZjTxQr_j_MsyId9dxEZtaZPZvA&s",
  ];
  const categories = ["Appetizers","Main Courses","Desserts","Drinks","Specials"];
  const tags = await CategoryTag.findAll();

  const getRandomTags = () => {
    const shuffled = [...tags].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.floor(Math.random() * 2) + 2);
  };

  const restaurants = await Restaurant.findAll({ include: [Branch, Menu] });

  for (const restaurant of restaurants) {
    const menu = await Menu.findOne({ where: { restaurant_id: restaurant.id } });
    if (!menu) continue;

    for (const branch of restaurant.Branches) {
      for (let i = 0; i < categories.length; i++) {
        const category = await MenuCategory.create({
          id: uuidv4(),
          restaurant_id: restaurant.id,
          branch_id: branch.id,
          menu_id: menu.id,
          name: categories[i],
          description: `${categories[i]} for ${branch.name}`,
          sort_order: i + 1,
          is_active: true,
          created_at: now,
          updated_at: now,
        });

        await category.addCategoryTags(getRandomTags());

        for (let j = 1; j <= 10; j++) {
          const img = foodImages[Math.floor(Math.random() * foodImages.length)];
          await MenuItem.create({
            id: uuidv4(),
            menu_category_id: category.id,
            name: `${categories[i]} Item ${j}`,
            description: `Delicious ${categories[i]} item ${j} at ${branch.name}`,
            unit_price: (j + i).toFixed(2),
            image: img,
            is_active: true,
            created_at: now,
            updated_at: now,
          });
        }
      }
    }
  }
};
