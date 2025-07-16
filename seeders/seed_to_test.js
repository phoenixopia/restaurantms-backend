"use strict";

const { sequelize } = require("../models");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment");

module.exports = async () => {
  try {
    const User = sequelize.models.User;
    const Role = sequelize.models.Role;
    const Restaurant = sequelize.models.Restaurant;
    const Subscription = sequelize.models.Subscription;
    const Plan = sequelize.models.Plan;

    const now = new Date();

    const [superAdminRole, restaurantAdminRole, staffRole, basicPlan] =
      await Promise.all([
        Role.findOne({ where: { name: "super_admin" } }),
        Role.findOne({ where: { name: "restaurant_admin" } }),
        Role.findOne({ where: { name: "staff" } }),
        Plan.findOne({ where: { name: "Basic" } }),
      ]);

    if (!superAdminRole || !restaurantAdminRole || !staffRole || !basicPlan) {
      throw new Error("Required roles or plan not found");
    }

    const superAdmin = await User.create({
      id: uuidv4(),
      first_name: "Super",
      last_name: "Admin",
      email: "natikeleme1@gmail.com",
      password: "12345678",
      role_id: superAdminRole.id,
      is_active: true,
      email_verified_at: now,
      password_changed_at: now,
      created_at: now,
      updated_at: now,
    });

    // 3. Create restaurant admin, restaurant, and subscription
    const restaurantAdmin = await User.create({
      id: uuidv4(),
      first_name: "Admin",
      last_name: "One",
      email: "bci00436@gmail.com",
      password: "12345678",
      role_id: restaurantAdminRole.id,
      is_active: true,
      email_verified_at: now,
      created_by: superAdmin.id,
      password_changed_at: now,
      created_at: now,
      updated_at: now,
    });

    const restaurant = await Restaurant.create({
      id: uuidv4(),
      restaurant_name: "Gourmet Delight",
      status: "active",
      created_at: now,
      updated_at: now,
    });

    await restaurantAdmin.update({
      restaurant_id: restaurant.id,
      updated_at: now,
    });

    await Subscription.create({
      restaurant_id: restaurant.id,
      plan_id: basicPlan.id,
      start_date: now,
      end_date: moment(now).add(1, "year").toDate(),
      status: "active",
      payment_method: "card",
      user_id: restaurantAdmin.id,
      created_at: now,
      updated_at: now,
    });

    const staffNames = ["One", "Two", "Three"];
    const staffEmails = [
      "nathnaelkeleme88@gmail.com",
      "efi007380@gmail.com",
      "z66738496@gmail.com",
    ];

    for (let i = 0; i < staffEmails.length; i++) {
      await User.create({
        id: uuidv4(),
        first_name: "Staff",
        last_name: staffNames[i],
        email: staffEmails[i],
        password: "12345678",
        role_id: staffRole.id,
        restaurant_id: null,
        created_by: restaurantAdmin.id,
        is_active: true,
        email_verified_at: now,
        password_changed_at: now,
        created_at: now,
        updated_at: now,
      });
    }

    console.log("✅ Seeding completed successfully");
    console.log("Test credentials:");
    console.log("- Super Admin: natikeleme1@gmail.com / 12345678");
    console.log("- Restaurant Admin: bci00436@gmail.com / 12345678");
    console.log("- Staff Users:");
    staffEmails.forEach((e) => console.log(`  • ${e} / 12345678`));
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  }
};
