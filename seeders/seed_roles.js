const { Role, RoleTag } = require("../models");
const { v4: uuidv4 } = require("uuid");

module.exports = async () => {
  const superAdminTag = await RoleTag.findOne({
    where: { name: "super_admin" },
  });
  const restaurantAdminTag = await RoleTag.findOne({
    where: { name: "restaurant_admin" },
  });
  const staffTag = await RoleTag.findOne({ where: { name: "staff" } });
  const customerTag = await RoleTag.findOne({ where: { name: "customer" } });

  if (!superAdminTag || !restaurantAdminTag || !staffTag || !customerTag) {
    throw new Error("Required role tags not found");
  }

  const systemUserId = uuidv4();

  const roles = await Role.bulkCreate([
    {
      id: uuidv4(),
      name: "Super Admin",
      role_tag_id: superAdminTag.id,
      description: "Super administrator role",
      created_by: systemUserId,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: uuidv4(),
      name: "Restaurant Admin",
      role_tag_id: restaurantAdminTag.id,
      description: "Restaurant administrator role",
      created_by: systemUserId,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: uuidv4(),
      name: "Customer",
      role_tag_id: customerTag.id,
      description: "Customer role",
      created_by: systemUserId,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: uuidv4(),
      name: "Staff",
      role_tag_id: staffTag.id,
      description: "Staff member role",
      created_by: systemUserId,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);

  console.log("✅ Roles seeded");
  return roles;
};
