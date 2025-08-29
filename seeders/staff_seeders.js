"use strict";

const { v4: uuidv4 } = require("uuid");
const {
  User,
  Role,
  RoleTag,
  Branch,
  Restaurant,
  Permission,
  RolePermission,
} = require("../models");

module.exports = async () => {
  const [staffRoleTag, adminRole] = await Promise.all([
    RoleTag.findOne({ where: { name: "staff" } }),
    Role.findOne({ where: { name: "Restaurant Administrator" } }),
  ]);

  if (!staffRoleTag) throw new Error("RoleTag 'staff' not found");
  if (!adminRole) throw new Error("Role 'Restaurant Administrator' not found");

  const restaurants = await Restaurant.findAll({ include: [Branch] });
  const now = new Date();

  const staffRolesList = ["Waiter", "Chef", "Cashier", "Bartender", "Host"];
  const staffPermissionsMap = {
    Waiter: ["view_menu", "view_order"],
    Chef: ["view_order", "change_order_status"],
    Cashier: ["view_order", "manage_charge_setting"],
    Bartender: ["view_menu", "view_order"],
    Host: ["view_branch", "view_reservations"],
  };

  for (const restaurant of restaurants) {
    const restaurantAdmin = await User.findOne({
      where: { restaurant_id: restaurant.id, role_id: adminRole.id },
    });

    if (!restaurantAdmin) {
      console.warn(
        `⚠️ No admin found for restaurant ${restaurant.restaurant_name}`
      );
      continue;
    }

    const roles = [];
    for (const roleName of staffRolesList) {
      const [staffRole] = await Role.findOrCreate({
        where: { name: roleName, restaurant_id: restaurant.id },
        defaults: {
          id: uuidv4(),
          role_tag_id: staffRoleTag.id,
          created_by: restaurantAdmin.id,
          description: `${roleName} role for ${restaurant.restaurant_name}`,
        },
      });

      roles.push(staffRole);

      const permissionNames = staffPermissionsMap[roleName] || [];
      const permissions = await Permission.findAll({
        where: { name: permissionNames },
      });

      // Assign permissions using findOrCreate
      for (const perm of permissions) {
        await RolePermission.findOrCreate({
          where: { role_id: staffRole.id, permission_id: perm.id },
          defaults: { id: uuidv4(), created_at: now, updated_at: now },
        });
      }
    }

    // Create 5 staff users per restaurant
    for (let i = 1; i <= 5; i++) {
      const branch = restaurant.Branches.length
        ? restaurant.Branches[(i - 1) % restaurant.Branches.length]
        : null;
      const assignedRole = roles[(i - 1) % roles.length];

      await User.findOrCreate({
        where: {
          email: `staff${i}@${restaurant.restaurant_name
            .toLowerCase()
            .replace(/\s+/g, "")}.example.com`,
        },
        defaults: {
          id: uuidv4(),
          first_name: `Staff${i}`,
          last_name: restaurant.restaurant_name,
          password: "12345678",
          branch_id: branch ? branch.id : null,
          restaurant_id: null,
          role_id: assignedRole.id,
          role_tag_id: staffRoleTag.id,
          created_by: restaurantAdmin.id,
          is_active: true,
          email_verified_at: now,
          password_changed_at: now,
          created_at: now,
          updated_at: now,
        },
      });
    }
  }

  console.log(
    "✅ Staff roles, users, and role-permission assignments seeded successfully per restaurant"
  );
};
