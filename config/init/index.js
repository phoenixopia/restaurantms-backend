const { User, Role } = require("../../models");
const { Op } = require("sequelize");
const { v4: uuidv4 } = require("uuid");

const createSuperAdmin = async (adminData) => {
  const sequelize = User.sequelize;

  try {
    const { name, email, phone_number, password } = adminData;

    if (!email && !phone_number) {
      console.log("You must provide at least an email or phone number.");
      process.exit(1);
    }

    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { phone_number }],
      },
    });

    if (existingUser) {
      console.log("A user with this email or phone number already exists.");
      process.exit(1);
    }

    const [first_name, ...lastParts] = name.trim().split(" ");
    const last_name = lastParts.join(" ") || "Admin";

    await sequelize.transaction(async (t) => {
      let superAdminRole = await Role.findOne({
        where: { name: "super_admin" },
        transaction: t,
      });

      if (!superAdminRole) {
        superAdminRole = await Role.create(
          {
            id: uuidv4(),
            name: "super_admin",
            description: "Super administrator with full permissions",
          },
          { transaction: t }
        );
      }

      newUser = await User.create(
        {
          id: uuidv4(),
          first_name,
          last_name,
          email: email || null,
          phone_number: phone_number || null,
          password,
          is_active: true,
          is_superuser: true,
          role_id: superAdminRole.id,
          created_by: null,
          email_verified_at: new Date(),
        },
        { transaction: t }
      );
    });

    const token = await newUser.getJwtToken();
    console.log("Super Admin created successfully.");
    console.log("JWT Token:", token);
    process.exit(0);
  } catch (error) {
    console.error("Error creating Super Admin:", error);
    process.exit(1);
  }
};

module.exports = {
  createSuperAdmin,
};
