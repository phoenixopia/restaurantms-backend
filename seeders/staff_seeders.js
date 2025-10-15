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
  await User.sync({ force: true });

  const [staffRoleTag, adminRole] = await Promise.all([
    RoleTag.findOne({ where: { name: "staff" } }),
    Role.findOne({ where: { name: "Restaurant Administrator" } }),
  ]);

  if (!staffRoleTag) throw new Error("RoleTag 'staff' not found");
  if (!adminRole) throw new Error("Role 'Restaurant Administrator' not found");

  const restaurants = await Restaurant.findAll({ include: [Branch] });
  const staffRolesList = ["Waiter", "Chef", "Cashier", "Bartender", "Host"];
  const staffPermissionsMap = {
    Waiter: ["view_menu", "view_order"],
    Chef: ["view_order", "change_order_status"],
    Cashier: ["view_order", "manage_charge_setting"],
    Bartender: ["view_menu", "view_order"],
    Host: ["view_branch", "view_reservations"],
  };
  const now = new Date();

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

    // Create roles
    const createdRoles = [];
    for (const roleName of staffRolesList) {
      const staffRole = await Role.create({
        id: uuidv4(),
        name: roleName,
        restaurant_id: restaurant.id,
        role_tag_id: staffRoleTag.id,
        created_by: restaurantAdmin.id,
        description: `${roleName} role for ${restaurant.restaurant_name}`,
        createdAt: now,
        updatedAt: now,
      });
      createdRoles.push(staffRole);

      // Assign permissions
      const permissionNames = staffPermissionsMap[roleName] || [];
      const permissions = await Permission.findAll({
        where: { name: permissionNames },
      });

      const rolePermissionsData = permissions.map((perm) => ({
        id: uuidv4(),
        role_id: staffRole.id,
        permission_id: perm.id,
        createdAt: now,
        updatedAt: now,
      }));

      if (rolePermissionsData.length) {
        await RolePermission.bulkCreate(rolePermissionsData);
      }
    }

    // Create 5 staff users per restaurant
    const usersData = [];
    for (let i = 1; i <= 5; i++) {
      const branch = restaurant.Branches.length
        ? restaurant.Branches[(i - 1) % restaurant.Branches.length]
        : null;
      const assignedRole = createdRoles[(i - 1) % createdRoles.length];

      usersData.push({
        id: uuidv4(),
        first_name: `Staff${i}`,
        last_name: restaurant.restaurant_name,
        email: `staff${i}${restaurant.restaurant_name
          .toLowerCase()
          .replace(/\s+/g, "")}@gmail.com`,
        password: "1234567890",
        branch_id: branch ? branch.id : null,
        restaurant_id: restaurant.id,
        role_id: assignedRole.id,
        role_tag_id: staffRoleTag.id,
        created_by: restaurantAdmin.id,
        is_active: true,
        email_verified_at: now,
        password_changed_at: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    await User.bulkCreate(usersData, { individualHooks: true });
  }

  console.log(
    "✅ Staff roles, users, and role-permission assignments seeded successfully per restaurant"
  );
};
