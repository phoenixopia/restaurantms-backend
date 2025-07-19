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
    const Branch = sequelize.models.Branch;
    const Location = sequelize.models.Location;
    const SystemSetting = sequelize.models.SystemSetting;
    const Menu = sequelize.models.Menu;
    const MenuCategory = sequelize.models.MenuCategory;
    const MenuItem = sequelize.models.MenuItem;
    const CategoryTag = sequelize.models.CategoryTag;

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

    // Create restaurant admins and restaurants
    const restaurantData = [
      {
        name: "Gourmet Delight",
        adminEmail: "bci00436@gmail.com",
        logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTviTd8s9_J0pBESz-EgQHk_p3KYnsaJBrpzQ&s",
      },
      {
        name: "Pizza Palace",
        adminEmail: "pizza_admin1@gmail.com",
        logo: "https://example.com/pizza_logo.jpg",
      },
      {
        name: "Burger Barn",
        adminEmail: "burger_admin1@gmail.com",
        logo: "https://example.com/burger_logo.jpg",
      },
      {
        name: "Sushi Spot",
        adminEmail: "sushi_admin1@gmail.com",
        logo: "https://example.com/sushi_logo.jpg",
      },
      {
        name: "Taco Town",
        adminEmail: "taco_admin1@gmail.com",
        logo: "https://example.com/taco_logo.jpg",
      },
      {
        name: "Pasta Paradise",
        adminEmail: "pasta_admin1@gmail.com",
        logo: "https://example.com/pasta_logo.jpg",
      },
      {
        name: "Steak House",
        adminEmail: "steak_admin1@gmail.com",
        logo: "https://example.com/steak_logo.jpg",
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

    for (const [index, data] of restaurantData.entries()) {
      const restaurantAdmin = await User.create({
        id: uuidv4(),
        first_name: "Admin",
        last_name: `${index + 1}`,
        email: data.adminEmail,
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
        restaurant_name: data.name,
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

      await SystemSetting.create({
        id: uuidv4(),
        restaurant_id: restaurant.id,
        logo_url: data.logo,
        images: [
          `https://example.com/${data.name
            .toLowerCase()
            .replace(/\s/g, "_")}_image1.jpg`,
          `https://example.com/${data.name
            .toLowerCase()
            .replace(/\s/g, "_")}_image2.jpg`,
        ],
        default_theme: "Light",
        primary_color: "#" + Math.floor(Math.random() * 16777215).toString(16),
        font_family: "Roboto",
        created_at: now,
        updated_at: now,
      });

      const locations = await Location.bulkCreate([
        {
          id: uuidv4(),
          name: `${data.name} Bole Branch Location`,
          address: "Bole Road, Addis Ababa",
          latitude: 8.9806 + (Math.random() * 0.01 - 0.005),
          longitude: 38.7578 + (Math.random() * 0.01 - 0.005),
          created_at: now,
          updated_at: now,
        },
        {
          id: uuidv4(),
          name: `${data.name} Megenagna Branch Location`,
          address: "Megenagna Square, Addis Ababa",
          latitude: 9.0227 + (Math.random() * 0.01 - 0.005),
          longitude: 38.7869 + (Math.random() * 0.01 - 0.005),
          created_at: now,
          updated_at: now,
        },
        {
          id: uuidv4(),
          name: `${data.name} Kazanchis Branch Location`,
          address: "Kazanchis Business District, Addis Ababa",
          latitude: 9.0185 + (Math.random() * 0.01 - 0.005),
          longitude: 38.7571 + (Math.random() * 0.01 - 0.005),
          created_at: now,
          updated_at: now,
        },
      ]);

      const branches = await Branch.bulkCreate([
        {
          id: uuidv4(),
          restaurant_id: restaurant.id,
          location_id: locations[0].id,
          name: `${data.name} Bole Branch`,
          manager_id: null,
          status: "active",
          main_branch: true,
          opening_time: "08:00:00",
          closing_time: "22:00:00",
          created_at: now,
          updated_at: now,
        },
        {
          id: uuidv4(),
          restaurant_id: restaurant.id,
          location_id: locations[1].id,
          name: `${data.name} Megenagna Branch`,
          manager_id: null,
          status: "active",
          main_branch: false,
          opening_time: "09:00:00",
          closing_time: "21:00:00",
          created_at: now,
          updated_at: now,
        },
        {
          id: uuidv4(),
          restaurant_id: restaurant.id,
          location_id: locations[2].id,
          name: `${data.name} Kazanchis Branch`,
          manager_id: null,
          status: "active",
          main_branch: false,
          opening_time: "07:30:00",
          closing_time: "23:00:00",
          created_at: now,
          updated_at: now,
        },
      ]);

      const staffNames = ["One", "Two", "Three"];
      const staffEmails = [
        `staff1_${index}@${data.name.toLowerCase().replace(/\s/g, "")}.com`,
        `staff2_${index}@${data.name.toLowerCase().replace(/\s/g, "")}.com`,
        `staff3_${index}@${data.name.toLowerCase().replace(/\s/g, "")}.com`,
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
          branch_id: branches[i].id,
          created_by: restaurantAdmin.id,
          is_active: true,
          email_verified_at: now,
          password_changed_at: now,
          created_at: now,
          updated_at: now,
        });
      }

      const menu = await Menu.create({
        id: uuidv4(),
        restaurant_id: restaurant.id,
        name: `${data.name} Main Menu`,
        description: `The main menu for ${data.name}`,
        is_active: true,
        created_by: restaurantAdmin.id,
        updated_by: restaurantAdmin.id,
        created_at: now,
        updated_at: now,
      });

      const categoryTags = await CategoryTag.findAll();

      const foodImages = [
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
        "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38",
        "https://images.unsplash.com/photo-1565958011703-44f9829ba187",
        "https://images.unsplash.com/photo-1482049016688-2d3e1b311543",
        "https://images.unsplash.com/photo-1484723091739-30a097e8f929",
      ];

      const getRandomTags = () => {
        const shuffled = [...categoryTags].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.floor(Math.random() * 2) + 2);
      };

      const categories = [
        "Appetizers",
        "Main Courses",
        "Desserts",
        "Drinks",
        "Specials",
      ];

      for (const branch of branches) {
        for (let i = 0; i < categories.length; i++) {
          const menuCategory = await MenuCategory.create({
            id: uuidv4(),
            restaurant_id: restaurant.id,
            branch_id: branch.id,
            menu_id: menu.id,
            name: `${categories[i]} - ${branch.name}`,
            description: `${categories[i]} for ${branch.name}`,
            sort_order: i + 1,
            is_active: true,
            created_at: now,
            updated_at: now,
          });

          await menuCategory.addCategoryTags(getRandomTags());

          for (let j = 1; j <= 10; j++) {
            const randomImage =
              foodImages[Math.floor(Math.random() * foodImages.length)];
            await MenuItem.create({
              id: uuidv4(),
              menu_category_id: menuCategory.id,
              name: `${categories[i]} Item ${j} - ${branch.name}`,
              description: `Delicious ${categories[
                i
              ].toLowerCase()} item ${j} at ${branch.name}`,
              unit_price: (10 + j + i).toFixed(2),
              image: randomImage,
              is_active: true,
              created_at: now,
              updated_at: now,
            });
          }
        }
      }
    }

    console.log("\u2705 Seeding completed successfully");
    console.log("Test credentials:");
    console.log("- Super Admin: natikeleme1@gmail.com / 12345678");
    console.log("\nRestaurants created with their admins:");
    restaurantData.forEach((r, i) => {
      console.log(`- ${r.name}: ${r.adminEmail} / 12345678`);
    });
  } catch (error) {
    console.error("\u274C Seeding failed:", error);
    throw error;
  }
};
