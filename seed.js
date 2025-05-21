const { Command } = require("commander");
const {
  seedRoles,
  seedPermissions,
  seedRolePermissions,
} = require("./seedActions");

const program = new Command();

program
  .command("seed-roles")
  .description("Seed roles into the database")
  .action(async () => {
    try {
      await seedRoles();
      console.log("Roles seeded successfully.");
      process.exit(0);
    } catch (err) {
      console.error("Error seeding roles:", err);
      process.exit(1);
    }
  });

program
  .command("seed-permissions")
  .description("Seed permissions into the database")
  .action(async () => {
    try {
      await seedPermissions();
      console.log("Permissions seeded successfully.");
      process.exit(0);
    } catch (err) {
      console.error("Error seeding permissions:", err);
      process.exit(1);
    }
  });

program
  .command("seed-role-permissions")
  .description("Seed role permissions into the database")
  .action(async () => {
    try {
      await seedRolePermissions();
      console.log("Role permissions seeded successfully.");
      process.exit(0);
    } catch (err) {
      console.error("Error seeding role permissions:", err);
      process.exit(1);
    }
  });

// New command to seed everything in sequence
program
  .command("seed-all")
  .description("Seed roles, permissions, and role permissions all at once")
  .action(async () => {
    try {
      await seedRoles();
      console.log("Roles seeded successfully.");
      await seedPermissions();
      console.log("Permissions seeded successfully.");
      await seedRolePermissions();
      console.log("Role permissions seeded successfully.");
      process.exit(0);
    } catch (err) {
      console.error("Error seeding data:", err);
      process.exit(1);
    }
  });

program.parse(process.argv);
