"use strict";

const {
  Restaurant,
  Subscription,
  SystemSetting,
  Plan,
  Role,
  RestaurantBankAccount,
  User,
} = require("../models");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment");

module.exports = async () => {
  const [basicPlan, restaurantAdminRole, superAdmin] = await Promise.all([
    Plan.findOne({ where: { name: "Basic", billing_cycle: "monthly" } }),
    Role.findOne({ where: { name: "Restaurant Administrator" } }),
    User.findOne({ where: { email: "superadmin@gmail.com" } }),
  ]);

  if (!basicPlan || !restaurantAdminRole || !superAdmin) {
    throw new Error(
      "Basic Plan, Restaurant Admin Role, or Super Admin not found."
    );
  }

  const restaurantData = [
    {
      name: "Gourmet Delight",
      adminEmail: "admin1@gmail.com",
      logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTviTd8s9_J0pBESz-EgQHk_p3KYnsaJBrpzQ&s",
    },
    {
      name: "Pizza Palace",
      adminEmail: "admin2@gmail.com",
      logo: "https://dypdvfcjkqkg2.cloudfront.net/large/3315923-6114.png",
    },
    {
      name: "Burger Barn",
      adminEmail: "admin3@gmail.com",
      logo: "https://images-platform.99static.com/vzaB9IWG4hZSbhI_mY2ynyE8Ozg=/500x500/top/smart/99designs-contests-attachments/35/35747/attachment_35747196",
    },
    {
      name: "Sushi Spot",
      adminEmail: "admin4@gmail.com",
      logo: "https://as2.ftcdn.net/jpg/05/02/61/63/1000_F_502616350_b5Q1hCInss324vtlZIgmi6dnQ3Ggi0vl.jpg",
    },
    {
      name: "Taco Town",
      adminEmail: "admin5@gmail.com",
      logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQY-B-BwPeE9BOGLmREB5dDn00pV5eceF_5xg&s",
    },
    {
      name: "Pasta Paradise",
      adminEmail: "admin6@gmail.com",
      logo: "https://img.freepik.com/premium-vector/modern-restaurant-logo-design-template_872774-98.jpg",
    },
    {
      name: "Steak House",
      adminEmail: "admin7@gmail.com",
      logo: "https://graphicsfamily.com/wp-content/uploads/edd/2023/02/Restaurant-Logo-Design-2-1180x664.jpg",
    },
    {
      name: "Veggie Delight",
      adminEmail: "admin8@gmail.com",
      logo: "https://cdn4.vectorstock.com/i/1000x1000/65/58/restaurant-logo-design-idea-vector-46986558.jpg",
    },
    {
      name: "Seafood Shack",
      adminEmail: "admin9@gmail.com",
      logo: "https://png.pngtree.com/png-clipart/20200727/original/pngtree-restaurant-logo-design-vector-template-png-image_5441058.jpg",
    },
    {
      name: "BBQ Joint",
      adminEmail: "admin10@gmail.com",
      logo: "https://png.pngtree.com/png-clipart/20200727/original/pngtree-restaurant-logo-design-vector-template-png-image_5441058.jpg",
    },
    {
      name: "Noodle House",
      adminEmail: "admin11@gmail.com",
      logo: "https://thumbs.dreamstime.com/b/restaurant-logo-design-modern-minimalist-branding-creative-culinary-ventures-dining-concept-unique-333213519.jpg",
    },
    {
      name: "Curry Corner",
      adminEmail: "admin12@gmail.com",
      logo: "https://res.cloudinary.com/zenbusiness/q_auto/v1/shared-assets/stk/restaurant-logo-with-fork-and-spoon.jpg",
    },
    {
      name: "Deli Fresh",
      adminEmail: "admin13@gmail.com",
      logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ6M-fYPND7uNZYf12F-ajMim1NOw7w2SR2zA&s",
    },
    {
      name: "Breakfast Cafe",
      adminEmail: "admin14@gmail.com",
      logo: "https://png.pngtree.com/png-clipart/20200709/original/pngtree-simple-restaurant-logo-icon-design-template-vector-png-image_3655016.jpg",
    },
    {
      name: "Dessert Heaven",
      adminEmail: "admin15@gmail.com",
      logo: "https://images.freecreatives.com/wp-content/uploads/2016/03/Fast-Food-Restaurant-Logo-Design.jpg",
    },
  ];

  const now = new Date();

  for (const data of restaurantData) {
    const restaurant = await Restaurant.create({
      id: uuidv4(),
      restaurant_name: data.name,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    await RestaurantBankAccount.create({
      id: uuidv4(),
      restaurant_id: restaurant.id,
      bank_name: "Commercial Bank of Ethiopia",
      account_number: "1000445824201",
      account_name: "Natnael Kelemie",
      is_default: true,
      is_active: true,
      createdAt: now,
      updatedAt: now,
    });

    await User.create({
      id: uuidv4(),
      first_name: "Admin",
      last_name: data.name,
      email: data.adminEmail,
      password: "1234567890",
      restaurant_id: restaurant.id,
      role_id: restaurantAdminRole.id,
      role_tag_id: restaurantAdminRole.role_tag_id,
      created_by: superAdmin.id,
      is_active: true,
      email_verified_at: now,
      password_changed_at: now,
      createdAt: now,
      updatedAt: now,
    });

    await Subscription.create({
      restaurant_id: restaurant.id,
      plan_id: basicPlan.id,
      start_date: now,
      end_date: moment(now).add(1, "month").toDate(),
      status: "active",
      payment_method: "card",
      createdAt: now,
      updatedAt: now,
    });

    await SystemSetting.create({
      id: uuidv4(),
      restaurant_id: restaurant.id,
      logo_url: data.logo,
      default_theme: "Light",
      primary_color: "#FF5733",
      font_family: "Roboto",
      createdAt: now,
      updatedAt: now,
    });
  }

  console.log(
    "✅ Restaurants, Admin Users, Subscriptions, Bank Accounts, and Settings seeded successfully"
  );
};
