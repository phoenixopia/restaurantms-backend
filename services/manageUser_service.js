const { User, Role, sequelize } = require("../models");
const throwError = require("../utils/throwError");

const UserService = {
  async createUser(creatorId, data) {
    const t = await sequelize.transaction();
    try {
      const {
        creatorMode,
        first_name,
        last_name,
        email,
        phone_number,
        password,
      } = data;

      if (!first_name || !last_name || !password || !creatorMode)
        throwError("Missing required fields", 400);

      if (creatorMode === "email" && !email)
        throwError("Email is required for email mode", 400);
      if (creatorMode === "phone" && !phone_number)
        throwError("Phone number is required for phone mode", 400);

      const role = await Role.findOne({
        where: { name: "staff" },
        transaction: t,
      });
      if (!role) throwError("Staff role not found", 404);

      const whereClause =
        creatorMode === "email" ? { email } : { phone_number };
      const exists = await User.findOne({ where: whereClause, transaction: t });
      if (exists)
        throwError(
          "A user with this email or phone number already exists",
          409
        );

      const newUser = await User.create(
        {
          first_name,
          last_name,
          email: creatorMode === "email" ? email : null,
          phone_number: creatorMode === "phone" ? phone_number : null,
          password,
          role_id: role.id,
          created_by: creatorId,
        },
        { transaction: t }
      );

      await t.commit();

      return {
        id: newUser.id,
        full_name: `${newUser.first_name} ${newUser.last_name}`,
        email: newUser.email,
        phone_number: newUser.phone_number,
        role_id: newUser.role_id,
      };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async deleteUser(id) {
    const t = await sequelize.transaction();
    try {
      const user = await User.findByPk(id, { transaction: t });
      if (!user) throwError("User not found", 404);
      await user.destroy({ transaction: t });
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async getCreatedUserById(creatorId, id) {
    const user = await User.findOne({
      where: { id, created_by: creatorId },
      attributes: [
        "id",
        "first_name",
        "last_name",
        "email",
        "phone_number",
        "is_active",
        "role_id",
        "createdAt",
      ],
      include: [{ model: Role, attributes: ["id", "name"] }],
    });
    if (!user)
      throwError(
        "User not found or you are not authorized to view this user",
        404
      );
    return user;
  },
};

module.exports = UserService;
