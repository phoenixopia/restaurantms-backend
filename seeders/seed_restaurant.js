"use strict";

const { Restaurant, Subscription, SystemSetting, Plan, Role } = require("../models");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment");

module.exports = async () => {

  const [basicPlan, restaurantAdminRole, superAdmin] = await Promise.all([
    Plan.findOne({ where: { name: "Basic" } }),
    Role.findOne({ where: { name: "restaurant_admin" } }),
    User.findOne({ where: { email: "superadmin@gmail.com" } }),
  ]);

  const restaurantData = [
   {
        name: "Gourmet Delight",
        adminEmail: "bci00436@gmail.com",
        logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTviTd8s9_J0pBESz-EgQHk_p3KYnsaJBrpzQ&s",
      },
      {
        name: "Pizza Palace",
        adminEmail: "pizza_admin1@gmail.com",
        logo: "https://dypdvfcjkqkg2.cloudfront.net/large/3315923-6114.png",
      },
      {
        name: "Burger Barn",
        adminEmail: "burger_admin1@gmail.com",
        logo: "https://images-platform.99static.com/vzaB9IWG4hZSbhI_mY2ynyE8Ozg=/500x500/top/smart/99designs-contests-attachments/35/35747/attachment_35747196",
      },
      {
        name: "Sushi Spot",
        adminEmail: "sushi_admin1@gmail.com",
        logo: "https://as2.ftcdn.net/jpg/05/02/61/63/1000_F_502616350_b5Q1hCInss324vtlZIgmi6dnQ3Ggi0vl.jpg",
      },
      {
        name: "Taco Town",
        adminEmail: "taco_admin1@gmail.com",
        logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQY-B-BwPeE9BOGLmREB5dDn00pV5eceF_5xg&s",
      },
      {
        name: "Pasta Paradise",
        adminEmail: "pasta_admin1@gmail.com",
        logo: "https://img.freepik.com/premium-vector/modern-restaurant-logo-design-template_872774-98.jpg",
      },
      {
        name: "Steak House",
        adminEmail: "steak_admin1@gmail.com",
        logo: "https://graphicsfamily.com/wp-content/uploads/edd/2023/02/Restaurant-Logo-Design-2-1180x664.jpg",
      },
      {
        name: "Veggie Delight",
        adminEmail: "veggie_admin1@gmail.com",
        logo: "https://example.com/veggie_logo.jpg",
      },
      {
        name: "Seafood Shack",
        adminEmail: "seafood_admin1@gmail.com",
        logo: "https://example.com/seafood_logo.jpg",
      },
      {
        name: "BBQ Joint",
        adminEmail: "bbq_admin1@gmail.com",
        logo: "https://example.com/bbq_logo.jpg",
      },
      {
        name: "Noodle House",
        adminEmail: "noodle_admin1@gmail.com",
        logo: "https://example.com/noodle_logo.jpg",
      },
      {
        name: "Curry Corner",
        adminEmail: "curry_admin1@gmail.com",
        logo: "https://example.com/curry_logo.jpg",
      },
      {
        name: "Deli Fresh",
        adminEmail: "deli_admin1@gmail.com",
        logo: "https://example.com/deli_logo.jpg",
      },
      {
        name: "Breakfast Cafe",
        adminEmail: "breakfast_admin1@gmail.com",
        logo: "https://example.com/breakfast_logo.jpg",
      },
      {
        name: "Dessert Heaven",
        adminEmail: "dessert_admin1@gmail.com",
        logo: "https://example.com/dessert_logo.jpg",
      },
  ];

  const now = new Date();

  for (const data of restaurantData) {
    const restaurantAdmin = await User.create({
      id: uuidv4(),
      first_name: "Admin",
      last_name: data.name,
      email: data.adminEmail,
      password: "1234567890",
      role_id: restaurantAdminRole.id,
      created_by: superAdmin.id,
      is_active: true,
      email_verified_at: now,
      password_changed_at: now,
      created_at: now,
      updated_at: now,
    });

    const restaurant = await Restaurant.create({
      id: uuidv4(),
      restaurant_name: data.name,
      status: "active",
      created_at: now,
      updated_at: now,
    });

    await restaurantAdmin.update({ restaurant_id: restaurant.id });

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

    await SystemSetting.create({
      id: uuidv4(),
      restaurant_id: restaurant.id,
      logo_url: data.logo,
      default_theme: "Light",
      primary_color: "#FF5733",
      font_family: "Roboto",
      created_at: now,
      updated_at: now,
    });
  }
};
