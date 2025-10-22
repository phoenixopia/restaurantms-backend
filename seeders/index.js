const { sequelize } = require("../models/index");

(async () => {
  try {
      console.log("Starting database seeding...");

      console.log("⏳ Dropping & syncing all tables...");
      // Let Sequelize handle model dependencies & circular FKs
      await sequelize.sync({ force: true });
      console.log("✅ All tables ready");

      // Begin seeding
      console.log("Seeding roles...");
      await require("./seed_roles")();
      console.log("✅ Roles seeded");

      console.log("Seeding category tags...");
      await require("./seed_category_tag")();
      console.log("✅ Category tags seeded");

      console.log("Seeding permissions...");
      await require("./seed_permission")();
      console.log("✅ Permissions seeded");

      console.log("Seeding role-permissions...");
      await require("./seed_role_permission")();
      console.log("✅ Role-permissions seeded");

      console.log("Seeding plans...");
      await require("./seed_plan")();
      console.log("✅ Plans seeded");

      console.log("Seeding locations...");
      await require("./location_seeder")();
      console.log("✅ Location seeded");

      console.log("Seeding restaurants...");
      await require("./seed_restaurant")();
      console.log("✅ Restaurants seeded");

      console.log("Seeding branches...");
      await require("./branch_seeders")();
      console.log("✅ Branches seeded");

      console.log("Seeding staff...");
      await require("./staff_seeders")();
      console.log("✅ Staff seeded");

      console.log("Seeding analytics snapshots...");
      await require("./snapshot_seeders")();
      console.log("✅ Analytics snapshots seeded");

      console.log("Seeding tables...");
      await require("./tables_seeders")();
      console.log("✅ Tables seeded");

      console.log("Seeding customers...");
      await require("./customers_seeders")();
      console.log("✅ Customers seeded");

      console.log("Seeding reservations...");
      await require("./reservation_seeders")();
      console.log("✅ Reservations seeded");

      console.log("Seeding menus...");
      await require("./menu_seeders")();
      console.log("✅ Menus seeded");

      console.log("Seeding menu categories & items...");
      await require("./menu_category_items_seeders")();
      console.log("✅ Menu categories & items seeded");

      console.log("Seeding catering...");
      await require("./catering_seeder")();
      console.log("✅ Catering seeded");

      console.log("Seeding request, tag, quote and payment seeded");
      await require("./catering_requests_and_payments_seed")();
      console.log("✅ seeding catering request, tag, quote and payment seeded");

      console.log("Seeding videos...");
      await require("./video_seeders")();
      console.log("✅ Videos seeded");

      console.log("Seeding restaurant followers & video interactions...");
      await require("./seed_restaurant_Followers_&_video_interaction")();
      console.log("✅ Restaurant followers & video interactions seeded");

      console.log("Seeding activity log...");
      await require("./activityLog_seeders")();
      console.log("✅ Activity Log seeded");

      console.log("Support Ticker...");
      await require("./support_ticket_seeders")();
      console.log("✅ Support Ticket seeded");

      console.log("Notification...");
      await require("./notification_seeders")();
      console.log("✅ Notification seeded");

      console.log("Seeding favorites...");
      await require("./favorites_seeder")();
      console.log("✅ Favorites seeded");

      console.log("Seeding orders...");
      await require("./order_seeder")();
      console.log("✅ Orders seeded");

      console.log("Seeding kds...");
      await require("./kds_seeders")();
      console.log("✅ KDS seeded");  
      
      console.log("Seeding reviews...");
      await require("./review_seeders")();
      console.log("✅ Reviews seeded");

      console.log("Seeding order items...");
      await require("./order_items_seed")();
      console.log("✅ Order items seeded");

      console.log("Seeding reviews...");
      await require("./review_seeders")();
      console.log("✅ Reviews seeded");

      console.log("🎉 All seeders completed successfully");
    } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await sequelize.close();
  }
})();
