const { User, Role, UserRole } = require("../../models/index");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");

const createSuperAdmin = async (adminData) => {
  try {
    const { name, email, phone_number, password } = adminData;

    const existingUser = await User.findOne({ where: { email } });

    if (existingUser) {
      console.log("A user with this email already exists.");
      process.exit(1);
    }

    const newUser = await User.create({
      id: uuidv4(),
      name,
      email,
      phone_number,
      password,
      is_active: true,
      is_superuser: true,
    });

    let superAdminRole = await Role.findOne({ where: { name: "super_admin" } });

    if (!superAdminRole) {
      superAdminRole = await Role.create({
        id: uuidv4(),
        name: "super_admin",
        description: "Super administrator with full permissions",
      });
    }

    await UserRole.create({
      id: uuidv4(),
      user_id: newUser.id,
      role_id: superAdminRole.id,
      restaurant_id: null,
    });

    console.log("Super Admin created successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error creating Super Admin:", error);
    process.exit(1);
  }
};

module.exports = {
  createSuperAdmin,
};
