const { User, Role } = require("../../models");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const speakeasy = require("speakeasy");
const { TwoFA } = require("../../models");

const createSuperAdmin = async (adminData) => {
  const { first_name, last_name, email, phone_number, password } = adminData;

  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      console.log("A user with this email already exists.");
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let superAdminRole = await Role.findOne({ where: { name: "super_admin" } });
    if (!superAdminRole) {
      superAdminRole = await Role.create({
        id: uuidv4(),
        name: "super_admin",
        description: "Super administrator with full permissions",
      });
    }

    const newUser = await User.create({
      id: uuidv4(),
      first_name,
      last_name,
      email,
      phone_number,
      password_hash: hashedPassword,
      isConfirmed: true,
      is_active: true,
      role_id: superAdminRole.id,
    });

    const secret = speakeasy.generateSecret({
      name: `RestaurantMS (${email})`,
    });

    await TwoFA.create({
      user_id: newUser.id,
      secret_key: secret.base32,
      is_enabled: true,
    });
    console.log("2FA Secret Key:", secret.otpauth_url);

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
