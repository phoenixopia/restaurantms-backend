"use strict";

const { v4: uuidv4 } = require("uuid");
const { User, Role, RoleTag, Branch, Restaurant } = require("../models");

module.exports = async () => {
  const staffRoleTag = await RoleTag.findOne({ where: { name: "staff" } });
  if (!staffRoleTag) throw new Error("RoleTag 'staff' not found");

  const restaurants = await Restaurant.findAll({
    include: [{ model: Branch }],
  });

  const now = new Date();
  const staffRolesList = ["Waiter", "Chef", "Cashier", "Bartender", "Host"];

  for (const restaurant of restaurants) {
    const restaurantAdmin = await User.findOne({
      where: {
        restaurant_id: restaurant.id,
        role_tag_id: (
          await RoleTag.findOne({ where: { name: "restaurant_admin" } })
        ).id,
      },
    });

    if (!restaurantAdmin) continue;

    // ✅ Create 5 roles only once per restaurant
    const roles = [];
    for (const roleName of staffRolesList) {
      const staffRole = await Role.create({
        id: uuidv4(),
        name: roleName,
        role_tag_id: staffRoleTag.id,
        restaurant_id: restaurant.id,
        created_by: restaurantAdmin.id,
        description: `${roleName} role for ${restaurant.name}`,
      });
      roles.push(staffRole);
    }

    // ✅ Create 3 staff users for this restaurant
    for (let i = 1; i <= 3; i++) {
      const branch = restaurant.Branches[i - 1]; // assign to branch1, branch2, branch3
      const assignedRole = roles[(i - 1) % roles.length]; // cycle through roles

      await User.create({
        id: uuidv4(),
        first_name: `Staff${i}`,
        last_name: restaurant.name,
        email: `staff${i}@${restaurant.name
          .toLowerCase()
          .replace(/\s+/g, "")}.example.com`,
        password: "12345678",
        branch_id: branch ? branch.id : null,
        role_id: assignedRole.id,
        role_tag_id: staffRoleTag.id,
        created_by: restaurantAdmin.id,
        is_active: true,
        email_verified_at: now,
        password_changed_at: now,
        created_at: now,
        updated_at: now,
      });
    }
  }

  console.log(
    "✅ 5 staff roles and 3 staff users seeded successfully per restaurant"
  );
};
