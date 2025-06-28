// seeders/xxxx-create-category-tags.js
module.exports = {
  up: async (queryInterface) => {
    const categoryNames = [
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

    const records = categoryNames.map((name) => ({
      id: require("uuid").v4(),
      name,
    }));

    await queryInterface.bulkInsert("category_tags", records);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("category_tags", null, {});
  },
};
