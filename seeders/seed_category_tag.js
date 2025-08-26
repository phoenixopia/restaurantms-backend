const { CategoryTag } = require("../models");
const { v4: uuidv4 } = require("uuid");

module.exports = async () => {
  const names = [
    "Drinks",
    "Hot Drinks",
    "Cold Drinks",
    "Breakfast",
    "Lunch",
    "Dinner",
    "Snacks",
    "Fast Food",
    "Burgers & Sandwiches",
    "Pizza",
    "Main Dishes",
    "Sides",
    "Salads",
    "Soups",
    "Desserts",
    "Kids Meals",
    "Specials",
  ];

  await CategoryTag.bulkCreate(
    names.map((name) => ({
      id: uuidv4(),
      name,
    }))
  );

  console.log("✅ Category tags seeded");
};
