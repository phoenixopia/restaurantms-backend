// seeders/seed_restaurant_admins.js
"use strict";

const { sequelize } = require("../models");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment");

module.exports = async () => {
  try {
    // Load models directly to avoid circular dependencies
    const User = sequelize.models.User;
    const Role = sequelize.models.Role;
    const Restaurant = sequelize.models.Restaurant;
    const Subscription = sequelize.models.Subscription;
    const Plan = sequelize.models.Plan;

    // 1. Find required roles and plans
    const [superAdminRole, restaurantAdminRole, basicPlan] = await Promise.all([
      Role.findOne({ where: { name: "super_admin" } }),
      Role.findOne({ where: { name: "restaurant_admin" } }),
      Plan.findOne({ where: { name: "Basic" } }),
    ]);

    if (!superAdminRole || !restaurantAdminRole || !basicPlan) {
      throw new Error("Required roles or plans not found");
    }

    // 2. Create super admin
    const superAdmin = await User.create({
      id: uuidv4(),
      first_name: "Super",
      last_name: "Admin",
      email: "natikeleme1@gmail.com",
      password: "12345678",
      role_id: superAdminRole.id,
      is_active: true,
      email_verified_at: new Date(),
      password_changed_at: new Date(),
    });

    // 3. Create restaurant admins with restaurants and subscriptions
    const adminData = [
      {
        email: "bci00436@gmail.com",
        name: "Admin One",
        restaurantName: "Gourmet Delight",
      },
      {
        email: "yak399515@gmail.com",
        name: "Admin Two",
        restaurantName: "Savory Bites",
      },
    ];

    for (const admin of adminData) {
      const restaurantAdmin = await User.create({
        id: uuidv4(),
        first_name: admin.name.split(" ")[0],
        last_name: admin.name.split(" ")[1],
        email: admin.email,
        password: "12345678",
        role_id: restaurantAdminRole.id,
        is_active: true,
        email_verified_at: new Date(),
        created_by: superAdmin.id,
        password_changed_at: new Date(),
      });

      const restaurant = await Restaurant.create({
        id: uuidv4(),
        restaurant_name: admin.restaurantName,
        status: "active",
      });

      await restaurantAdmin.update({ restaurant_id: restaurant.id });

      await Subscription.create({
        restaurant_id: restaurant.id,
        plan_id: basicPlan.id,
        start_date: new Date(),
        end_date: moment().add(1, "year").toDate(),
        status: "active",
        payment_method: "card",
        user_id: restaurantAdmin.id,
      });
    }

    console.log("✅ Seeding completed successfully");
    console.log("Test credentials:");
    console.log("- Super Admin: natikeleme1@gmail.com / 12345678");
    console.log("- Restaurant Admin 1: bci00436@gmail.com / 12345678");
    console.log("- Restaurant Admin 2: yak399515@gmail.com / 12345678");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  }
};
