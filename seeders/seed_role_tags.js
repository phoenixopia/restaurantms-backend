const { RoleTag } = require("../models");
const { v4: uuidv4 } = require("uuid");

module.exports = async () => {
  const roleTags = await RoleTag.bulkCreate([
    {
      id: uuidv4(),
      name: "super_admin",
      description: "Super administrator role tag",
    },
    {
      id: uuidv4(),
      name: "restaurant_admin",
      description: "Restaurant administrator role tag",
    },
    {
      id: uuidv4(),
      name: "staff",
      description: "Staff member role tag",
    },
    {
      id: uuidv4(),
      name: "customer",
      description: "Customer role tag",
    },
  ]);

  console.log("✅ Role tags seeded");
  return roleTags;
};
