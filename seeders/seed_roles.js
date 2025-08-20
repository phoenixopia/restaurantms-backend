const { Role } = require("../models");

module.exports = async () => {
  const roles = await Role.bulkCreate([
    { name: "super_admin", description: "Super administrator role" },
    { name: "restaurant_admin", description: "Restaurant administrator role" },
    { name: "customer", description: "Customer role" },
    { name: "staff", description: "Staff member role" },
  ]);
  console.log("✅ Roles seeded");
  return roles;
};
