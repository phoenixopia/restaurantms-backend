"use strict";

const { User, Role, sequelize } = require("../../models");
const throwError = require("../../utils/throwError");
const { sendUserCredentialsEmail } = require("../../utils/sendEmail");

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

      const now = new Date();

      const newUser = await User.create(
        {
          first_name,
          last_name,
          email: creatorMode === "email" ? email : null,
          phone_number: creatorMode === "phone" ? phone_number : null,
          password,
          role_id: role.id,
          created_by: creatorId,
          email_verified_at: creatorMode === "email" ? now : null,
          phone_verified_at: creatorMode === "phone" ? now : null,
        },
        { transaction: t }
      );

      await t.commit();

      if (creatorMode === "email") {
        try {
          await sendUserCredentialsEmail(
            email,
            first_name,
            last_name,
            password
          );
        } catch (emailErr) {
          console.error("User created, but failed to send email:", emailErr);
          throwError(
            "User created, but failed to send email notification",
            500
          );
        }
      }

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
      include: [{ model: Role, attributes: ["id", "name"] }],
    });

    if (!user)
      throwError(
        "User not found or you are not authorized to view this user",
        404
      );

    return user;
  },

  async getAllCreatedUsers(adminId, query = {}) {
    const { page, limit, offset, order } = buildPagination(query);

    const { count, rows: users } = await User.findAndCountAll({
      where: { created_by: adminId },
      limit,
      offset,
      order,
    });

    return {
      total: count,
      page,
      limit,
      users,
    };
  },

  async assignUserToBranch(userId, branchId, currentUser) {
    const t = await sequelize.transaction();
    try {
      const user = await User.findByPk(userId, { transaction: t });
      if (!user) throwError("User not found", 404);

      const branch = await sequelize.models.Branch.findOne({
        where: { id: branchId },
        include: [
          {
            model: sequelize.models.Restaurant,
            where: { created_by: currentUser.id },
          },
        ],
        transaction: t,
      });

      if (!branch) {
        throwError(
          "Branch not found or does not belong to your restaurant",
          403
        );
      }

      branch.manager_id = user.id;
      await branch.save({ transaction: t });

      const manageBranchPermission = await sequelize.models.Permission.findOne({
        where: { name: "manage_branch" },
        transaction: t,
      });

      if (!manageBranchPermission) {
        throwError("Permission 'manage_branch' not found", 404);
      }

      const existing = await sequelize.models.UserPermission.findOne({
        where: {
          user_id: userId,
          permission_id: manageBranchPermission.id,
          granted: true,
        },
        transaction: t,
      });

      if (!existing) {
        // Grant the permission
        await sequelize.models.UserPermission.create(
          {
            user_id: userId,
            permission_id: manageBranchPermission.id,
            granted: true,
            granted_by: currentUser.id,
          },
          { transaction: t }
        );
      }

      await t.commit();

      return {
        message: "User assigned as branch manager and permission granted",
        userId: user.id,
        branchId: branch.id,
      };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },
};

module.exports = UserService;
