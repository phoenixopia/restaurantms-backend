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
          "https://plus.unsplash.com/premium_photo-1661883237884-263e8de8869b?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8cmVzdGF1cmFudHxlbnwwfHwwfHx8MA%3D%3D",
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
          opening_time: "02:00:00",
          closing_time: "04:00:00",
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
          opening_time: "02:00:00",
          closing_time: "03:00:00",
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
          opening_time: "02:30:00",
          closing_time: "03:00:00",
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
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQMFUQWUr_5SKpmX24mZIWpQAYKj5iCJ9p7fA&s",
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT-coO6G2IuI734BMaQkhQk0NrYguFtEhJ8dw&s",
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQngrxUh-xvZjTxQr_j_MsyId9dxEZtaZPZvA&s",
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT2o86IDNmk8t6E2yl-5LPK401pby8B2BX0Vg&s",
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ_h6zQdDnnf-WQsmf4ZP7bjskEG51CJEqH1g&s",
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
            name: `${categories[i]}`,
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
              name: `${categories[i]} Item ${j}}`,
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

    const customers = await sequelize.models.Customer.bulkCreate([
      {
        id: uuidv4(),
        first_name: "John",
        last_name: "Doe",
        email: "john.doe@example.com",
        password: "12345678",
        profile_picture:
          "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRij6dtiHizH96qpCOe8WeXXP3yLyQJkPdGVg&s",
        dob: new Date(1990, 0, 1),
        email_verified_at: now,

        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        first_name: "Jane",
        last_name: "Smith",
        email: "jane.smith@example.com",

        password: "12345678",
        profile_picture:
          "https://cdn.pixabay.com/photo/2023/02/17/16/25/man-7796384_1280.jpg",
        dob: new Date(1991, 1, 2),
        email_verified_at: now,

        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        first_name: "Michael",
        last_name: "Johnson",
        email: "michael.johnson@example.com",

        password: "12345678",
        profile_picture:
          "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTvJaoIeJQU_V9rL_ZII61whWyqSFbmMgTgwQ&s",
        dob: new Date(1992, 2, 3),
        email_verified_at: now,

        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        first_name: "Emily",
        last_name: "Williams",
        email: "emily.williams@example.com",

        password: "12345678",
        profile_picture:
          "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRij6dtiHizH96qpCOe8WeXXP3yLyQJkPdGVg&s",
        dob: new Date(1993, 3, 4),
        email_verified_at: now,

        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        first_name: "David",
        last_name: "Brown",
        email: "david.brown@example.com",

        password: "12345678",
        profile_picture: "https://randomuser.me/api/portraits/men/5.jpg",
        dob: new Date(1994, 4, 5),
        email_verified_at: now,

        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        first_name: "Sarah",
        last_name: "Jones",
        email: "sarah.jones@example.com",

        password: "12345678",
        profile_picture: "https://randomuser.me/api/portraits/women/6.jpg",
        dob: new Date(1995, 5, 6),
        email_verified_at: now,

        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        first_name: "Robert",
        last_name: "Garcia",
        email: "robert.garcia@example.com",

        password: "12345678",
        profile_picture: "https://randomuser.me/api/portraits/men/7.jpg",
        dob: new Date(1996, 6, 7),
        email_verified_at: now,

        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        first_name: "Jennifer",
        last_name: "Martinez",
        email: "jennifer.martinez@example.com",

        password: "12345678",
        profile_picture: "https://randomuser.me/api/portraits/women/8.jpg",
        dob: new Date(1997, 7, 8),
        email_verified_at: now,

        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        first_name: "Thomas",
        last_name: "Wilson",
        email: "thomas.wilson@example.com",

        password: "12345678",
        profile_picture: "https://randomuser.me/api/portraits/men/9.jpg",
        dob: new Date(1998, 8, 9),
        email_verified_at: now,

        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        first_name: "Lisa",
        last_name: "Anderson",
        email: "lisa.anderson@example.com",

        password: "12345678",
        profile_picture: "https://randomuser.me/api/portraits/women/10.jpg",
        dob: new Date(1999, 9, 10),
        email_verified_at: now,

        created_at: now,
        updated_at: now,
      },
    ]);

    // Video-related data
    const videoTitles = [
      "Delicious Food Experience",
      "Our Special Dish",
      "Kitchen Secrets",
      "Chef's Recommendation",
      "Customer Favorite",
      "New Menu Item",
      "Behind the Scenes",
      "Food Preparation",
      "Tasty Bites",
      "Special Offer",
    ];

    const videoDescriptions = [
      "Check out our amazing food preparation process",
      "Our most popular dish that customers love",
      "See how our chefs create magic in the kitchen",
      "A special recommendation from our head chef",
      "This is why our customers keep coming back",
      "Introducing our newest menu addition",
      "Exclusive behind-the-scenes look at our restaurant",
      "Watch how we prepare this delicious meal",
      "Tasty bites that will make your mouth water",
      "Special offer just for our loyal customers",
    ];

    const videoUrls = [
      "https://youtu.be/xPPLbEFbCAo?si=bescuEhKTJU3gWwV",
      "https://youtube.com/shorts/KKw-SbklJwM?si=TK-tG0TPFMCphovA",
      "https://youtu.be/9OquUp6x5IU?si=D_cjdhL__TpIbU9-",
      "https://youtube.com/shorts/cY3qSAw71qc?si=gzDfrxGpwze6ZMRY",
      "https://youtube.com/shorts/9CfS_3ZK5FA?si=YgpGgsYHNmDyKRnJ",
      "https://youtube.com/shorts/Qbg25VhgB1I?si=91m4duurEGZgwqet",
      "https://youtube.com/shorts/GaU2og5snfk?si=7rIuZXlEEf7Ydp65",
      "https://youtube.com/shorts/Dlj3OpLJg8w?si=p0Lzs6v3VFWR_NyBhttps://example.com/videos/video8.mp4",
      "https://youtube.com/shorts/Cyahmutl3uI?si=b-xPJVlJ3KrUfOML",
      "https://youtube.com/shorts/Dlj3OpLJg8w?si=N91rwOwrJW5NNO8r",
    ];

    const thumbnailUrls = [
      "https://d1csarkz8obe9u.cloudfront.net/posterpreviews/restaurant-instagram-reels-promotion-design-template-64b1fcbb3161914748df8064d291635f_screen.jpg?ts=1664733714",
      "https://media.gettyimages.com/id/1433736166/video/defocus-new-normal-bar-in-night-and-sustainability.jpg?s=640x640&k=20&c=c4Oiai0p2ETB6Xiz44HxP2VPL9jEU--JEjlPWcI6Y8Y=",
      "https://www.picmaker.com/templates/_next/image?url=https%3A%2F%2Fstatic.picmaker.com%2Fscene-prebuilts%2Fthumbnails%2FYT-0086.png&w=3840&q=75",
      "https://www.shutterstock.com/image-photo/ginger-picture-curry-recipe-bowlgarlic-260nw-2483629083.jpg",
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ_h6zQdDnnf-WQsmf4ZP7bjskEG51CJEqH1g&s",
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQMFUQWUr_5SKpmX24mZIWpQAYKj5iCJ9p7fA&s",
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQngrxUh-xvZjTxQr_j_MsyId9dxEZtaZPZvA&s",
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQngrxUh-xvZjTxQr_j_MsyId9dxEZtaZPZvA&s",
      "https://www.shutterstock.com/image-photo/ginger-picture-curry-recipe-bowlgarlic-260nw-2483629083.jpg",
      "https://www.shutterstock.com/image-photo/ginger-picture-curry-recipe-bowlgarlic-260nw-2483629083.jpg",
    ];

    // Get all restaurants with their admins, staff, branches and menu items
    // Get all restaurants with their branches
    const restaurants = await sequelize.models.Restaurant.findAll({
      include: [
        {
          model: sequelize.models.Branch,
        },
      ],
    });

    // Get all restaurant admins
    const restaurantAdmins = await sequelize.models.User.findAll({
      where: { role_id: restaurantAdminRole.id },
    });

    // Get all staff members
    const staffMembers = await sequelize.models.User.findAll({
      where: { role_id: staffRole.id },
    });

    // Get all menu categories with their items and branch info
    const menuCategories = await sequelize.models.MenuCategory.findAll({
      include: [
        {
          model: sequelize.models.MenuItem,
        },
        {
          model: sequelize.models.Branch,
          attributes: ["id"],
        },
      ],
    });

    // Create videos for each restaurant
    for (const restaurant of restaurants) {
      // Get restaurant admin
      const restaurantAdmin = restaurantAdmins.find(
        (admin) => admin.restaurant_id === restaurant.id
      );
      if (!restaurantAdmin) continue;

      // Get staff for this restaurant's branches
      const restaurantStaff = staffMembers.filter((staff) =>
        restaurant.Branches.some((branch) => branch.id === staff.branch_id)
      );
      if (restaurantStaff.length === 0) continue;

      // Get menu categories for this restaurant
      const restaurantMenuCategories = menuCategories.filter(
        (category) => category.restaurant_id === restaurant.id
      );

      // Collect all menu items for this restaurant with their branch info
      const menuItems = [];
      for (const category of restaurantMenuCategories) {
        for (const item of category.MenuItems) {
          menuItems.push({
            ...item.toJSON(),
            branch_id: category.branch_id,
          });
        }
      }

      // Create 5 videos for this restaurant
      const videos = [];
      for (let i = 0; i < 5; i++) {
        const randomTitleIndex = Math.floor(Math.random() * videoTitles.length);
        const randomDescIndex = Math.floor(
          Math.random() * videoDescriptions.length
        );
        const randomVideoIndex = Math.floor(Math.random() * videoUrls.length);
        const randomThumbnailIndex = Math.floor(
          Math.random() * thumbnailUrls.length
        );
        const randomDuration = Math.floor(Math.random() * 120) + 30; // 30-150 seconds

        const videoData = {
          id: uuidv4(),
          restaurant_id: restaurant.id,
          title: videoTitles[randomTitleIndex],
          description: videoDescriptions[randomDescIndex],
          video_url: videoUrls[randomVideoIndex],
          thumbnail_url: thumbnailUrls[randomThumbnailIndex],
          duration: randomDuration,
          status: "approved",
          created_at: now,
          updated_at: now,
        };

        if (i < 2) {
          // First 2 videos - created by admin, no branch, no menu item
          videoData.uploaded_by = restaurantAdmin.id;
          videoData.branch_id = null;
        } else {
          // Last 3 videos - created by staff, with branch and menu item
          const staffIndex = (i - 2) % restaurantStaff.length;
          const staffMember = restaurantStaff[staffIndex];

          videoData.uploaded_by = staffMember.id;
          videoData.branch_id = staffMember.branch_id;

          // Associate with a random menu item from the staff's branch
          if (menuItems.length > 0) {
            const branchMenuItems = menuItems.filter(
              (item) => item.branch_id === staffMember.branch_id
            );

            if (branchMenuItems.length > 0) {
              const randomMenuItem =
                branchMenuItems[
                  Math.floor(Math.random() * branchMenuItems.length)
                ];
              videoData.menu_item_id = randomMenuItem.id;
            }
          }
        }

        videos.push(videoData);
      }

      const createdVideos = await sequelize.models.Video.bulkCreate(videos);

      // Create interactions (views, likes, favorites) for these videos
      for (const video of createdVideos) {
        // Random number of views (5-20)
        const viewCount = Math.floor(Math.random() * 16) + 5;
        const views = [];
        const likes = [];
        const favorites = [];

        // Select random customers for interactions
        const shuffledCustomers = [...customers].sort(
          () => 0.5 - Math.random()
        );
        const viewingCustomers = shuffledCustomers.slice(0, viewCount);
        const likingCustomers = shuffledCustomers.slice(
          0,
          Math.floor(viewCount * 0.7)
        );
        const favoritingCustomers = shuffledCustomers.slice(
          0,
          Math.floor(viewCount * 0.3)
        );

        // Create views
        for (const customer of viewingCustomers) {
          views.push({
            id: uuidv4(),
            video_id: video.id,
            customer_id: customer.id,
            created_at: now,
          });
        }

        // Create likes
        for (const customer of likingCustomers) {
          likes.push({
            id: uuidv4(),
            video_id: video.id,
            customer_id: customer.id,
            created_at: now,
          });
        }

        // Create favorites
        for (const customer of favoritingCustomers) {
          favorites.push({
            id: uuidv4(),
            video_id: video.id,
            customer_id: customer.id,
            created_at: now,
          });
        }
        for (const video of createdVideos) {
          // Random number of views (5-20)
          const viewCount = Math.floor(Math.random() * 16) + 5;
          const views = [];
          const likes = [];
          const favorites = [];
          const comments = [];

          // Select random customers for interactions
          const shuffledCustomers = [...customers].sort(
            () => 0.5 - Math.random()
          );
          const interactingCustomers = shuffledCustomers.slice(0, viewCount);

          // Only include customers who have interacted in views
          for (const customer of interactingCustomers) {
            views.push({
              id: uuidv4(),
              video_id: video.id,
              customer_id: customer.id,
              created_at: now,
            });

            // Random chance to like (70%)
            if (Math.random() < 0.7) {
              likes.push({
                id: uuidv4(),
                video_id: video.id,
                customer_id: customer.id,
                created_at: now,
              });
            }

            // Random chance to favorite (30%)
            if (Math.random() < 0.3) {
              favorites.push({
                id: uuidv4(),
                video_id: video.id,
                customer_id: customer.id,
                created_at: now,
              });
            }

            // Random chance to comment (40%)
            if (Math.random() < 0.4) {
              const commentTexts = [
                "Great video!",
                "This looks delicious!",
                "I want to try this!",
                "Amazing content!",
                "When can I order this?",
                "The chef did a great job!",
                "This is my favorite dish!",
                "The presentation is beautiful!",
                "I can't wait to visit!",
                "The food looks so fresh!",
              ];
              const randomComment =
                commentTexts[Math.floor(Math.random() * commentTexts.length)];

              comments.push({
                id: uuidv4(),
                video_id: video.id,
                customer_id: customer.id,
                comment_text: randomComment,
                created_at: now,
                updated_at: now,
              });
            }
          }

          await Promise.all([
            sequelize.models.VideoView.bulkCreate(views, {
              ignoreDuplicates: true, // This will skip duplicate entries
            }),
            sequelize.models.VideoLike.bulkCreate(likes, {
              ignoreDuplicates: true,
            }),
            sequelize.models.VideoFavorite.bulkCreate(favorites, {
              ignoreDuplicates: true,
            }),
            sequelize.models.VideoComment.bulkCreate(comments, {
              ignoreDuplicates: true,
            }),
          ]);
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
