const { Command } = require("commander");
const inquirer = require("inquirer");
const { createSuperAdmin } = require("./index");

const program = new Command();

program
  .command("create-super_admin")
  .alias("csa")
  .description("Create a super admin user")
  .action(async () => {
    const questions = [
      {
        type: "input",
        name: "name",
        message: "Enter Full Name:",
        validate: (input) => (input ? true : "Name is required"),
      },
      {
        type: "input",
        name: "email",
        message: "Enter Email Address:",
        validate: (input) =>
          /\S+@\S+\.\S+/.test(input) ? true : "Valid email is required",
      },
      {
        type: "input",
        name: "phone_number",
        message: "Enter Phone Number:",
        validate: (input) =>
          /^\+?[0-9]\d{1,14}$/.test(input)
            ? true
            : "Valid phone number is required",
      },
      {
        type: "password",
        name: "password",
        message: "Enter Password:",
        mask: "*",
        validate: (input) =>
          input.length >= 6 ? true : "Password must be at least 6 characters",
      },
    ];

    const answers = await inquirer.prompt(questions);
    await createSuperAdmin(answers);
  });

program.parse(process.argv);
