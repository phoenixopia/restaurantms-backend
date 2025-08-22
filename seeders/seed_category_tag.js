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

  for (const name of names) {
    const [tag, created] = await CategoryTag.findOrCreate({
      where: { name },
      defaults: { id: uuidv4() },
    });
    if (created) console.log(`✅ Created category tag: ${name}`);
  }
};
