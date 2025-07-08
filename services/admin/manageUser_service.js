"use strict";

const { User, Role, Restaurant, Branch, sequelize } = require("../../models");
const throwError = require("../../utils/throwError");
const { sendUserCredentialsEmail } = require("../../utils/sendEmail");

const UserService = {
  async createRestaurantAdmin(superAdminId, data) {
    const t = await sequelize.transaction();
    try {
      const {
        first_name,
        last_name,
        email,
        phone_number,
        password,
        restaurant_id = null,
        creatorMode,
      } = data;

      if (!first_name || !last_name || !password)
        throwError("Missing required fields", 400);
      if (creatorMode === "email" && !email)
        throwError("Email is required for email mode", 400);
      if (creatorMode === "phone" && !phone_number)
        throwError("Phone number is required for phone mode", 400);

      if (restaurant_id) {
        const restaurant = await Restaurant.findByPk(restaurant_id, {
          transaction: t,
        });
        if (!restaurant) throwError("Invalid restaurant_id provided", 400);
      }

      const role = await Role.findOne({
        where: { name: "restaurant_admin" },
        transaction: t,
      });
      if (!role) throwError("Role 'restaurant_admin' not found", 404);

      const whereClause =
        creatorMode === "email" ? { email } : { phone_number };
      if (await User.findOne({ where: whereClause, transaction: t }))
        throwError("User with this email or phone already exists", 409);

      const now = new Date();

      const newUser = await User.create(
        {
          first_name,
          last_name,
          email: creatorMode === "email" ? email : null,
          phone_number: creatorMode === "phone" ? phone_number : null,
          password,
          role_id: role.id,
          restaurant_id,
          branch_id: null,
          created_by: superAdminId,
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
        } catch (e) {
          console.error("Email send failed:", e);
        }
      }

      return {
        id: newUser.id,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        email: newUser.email,
        phone_number: newUser.phone_number,
        role_id: newUser.role_id,
        restaurant_id: newUser.restaurant_id,
        branch_id: newUser.branch_id,
        created_by: newUser.created_by,
      };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async createStaff(restaurantAdminId, data) {
    const t = await sequelize.transaction();
    try {
      const {
        first_name,
        last_name,
        email,
        phone_number,
        password,
        branch_id = null,
        creatorMode,
      } = data;

      if (!first_name || !last_name || !password)
        throwError("Missing required fields", 400);
      if (creatorMode === "email" && !email)
        throwError("Email is required for email mode", 400);
      if (creatorMode === "phone" && !phone_number)
        throwError("Phone number is required for phone mode", 400);

      const creator = await User.findByPk(restaurantAdminId, {
        transaction: t,
      });
      if (!creator) throwError("Creator not found", 404);
      if (!creator.restaurant_id) throwError("Creator has no restaurant", 400);

      if (branch_id) {
        const branch = await Branch.findOne({
          where: { id: branch_id, restaurant_id: creator.restaurant_id },
          transaction: t,
        });
        if (!branch)
          throwError(
            "Branch not found or does not belong to your restaurant",
            400
          );
      }

      const role = await Role.findOne({
        where: { name: "staff" },
        transaction: t,
      });
      if (!role) throwError("Role 'staff' not found", 404);

      const whereClause =
        creatorMode === "email" ? { email } : { phone_number };
      if (await User.findOne({ where: whereClause, transaction: t }))
        throwError("User with this email or phone already exists", 409);

      const now = new Date();

      const newUser = await User.create(
        {
          first_name,
          last_name,
          email: creatorMode === "email" ? email : null,
          phone_number: creatorMode === "phone" ? phone_number : null,
          password,
          role_id: role.id,
          restaurant_id: null,
          branch_id,
          created_by: restaurantAdminId,
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
        } catch (e) {
          console.error("Email send failed:", e);
        }
      }

      return {
        id: newUser.id,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        email: newUser.email,
        phone_number: newUser.phone_number,
        role_id: newUser.role_id,
        restaurant_id: newUser.restaurant_id,
        branch_id: newUser.branch_id,
        created_by: newUser.created_by,
      };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async deleteUser(id, deleterId) {
    const t = await sequelize.transaction();
    try {
      const user = await User.findByPk(id, { transaction: t });
      if (!user) throwError("User not found", 404);

      if (user.created_by !== deleterId) {
        throwError("You are not authorized to delete this user", 403);
      }

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
      include: [
        {
          model: Role,
          attributes: ["id", "name"],
          include: [
            {
              model: sequelize.models.Permission,
              through: {
                where: { granted: true },
                attributes: [],
              },
              attributes: ["id", "name", "description"],
            },
          ],
        },
        {
          model: sequelize.models.UserPermission,
          where: { granted: true },
          required: false,
          include: [
            {
              model: sequelize.models.Permission,
              attributes: ["id", "name", "description"],
            },
          ],
        },
      ],
    });

    if (!user)
      throwError(
        "User not found or you are not authorized to view this user",
        404
      );

    const rolePermissions = user.Role?.Permissions?.map((p) => p.name) || [];
    const userPermissions =
      user.UserPermissions?.map((up) => up.Permission.name) || [];

    const allPermissions = [
      ...new Set([...rolePermissions, ...userPermissions]),
    ];

    return {
      ...user.toJSON(),
      permissions: allPermissions,
    };
  },

  async getAllCreatedUsers(adminId, query = {}) {
    const { page, limit, offset, order } = buildPagination(query);

    const { count, rows: users } = await User.findAndCountAll({
      where: { created_by: adminId },
      limit,
      offset,
      order,
      include: [
        {
          model: Role,
          attributes: ["id", "name"],
          include: [
            {
              model: sequelize.models.Permission,
              through: {
                where: { granted: true },
                attributes: [],
              },
              attributes: ["id", "name", "description"],
            },
          ],
        },
        {
          model: sequelize.models.UserPermission,
          where: { granted: true },
          required: false,
          include: [
            {
              model: sequelize.models.Permission,
              attributes: ["id", "name", "description"],
            },
          ],
        },
      ],
    });

    const usersWithPermissions = users.map((user) => {
      const rolePermissions = user.Role?.Permissions?.map((p) => p.name) || [];
      const userPermissions =
        user.UserPermissions?.map((up) => up.Permission.name) || [];

      return {
        ...user.toJSON(),
        permissions: [...new Set([...rolePermissions, ...userPermissions])],
      };
    });

    return {
      total: count,
      page,
      limit,
      users: usersWithPermissions,
    };
  },

  async assignUserToBranch(userId, branchId, currentUser) {
    const t = await sequelize.transaction();
    try {
      const user = await User.findByPk(userId, { transaction: t });
      if (!user) throwError("User not found", 404);

      if (user.created_by !== currentUser.id) {
        throwError("You are not authorized to assign this user", 403);
      }

      const branch = await Branch.findOne({
        where: { id: branchId, restaurant_id: currentUser.restaurant_id },
        transaction: t,
      });

      if (!branch) {
        throwError(
          "Branch not found or does not belong to your restaurant",
          403
        );
      }

      user.branch_id = branch.id;
      await user.save({ transaction: t });

      await t.commit();

      return {
        message: "User assigned to branch successfully",
        userId: user.id,
        branchId: branch.id,
      };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async assignUserToRestaurant(userId, restaurantId, currentUser) {
    const t = await sequelize.transaction();
    try {
      const user = await User.findByPk(userId, {
        include: [{ model: Role }],
        transaction: t,
      });
      if (!user) throwError("User not found", 404);

      if (user.Role?.name !== "restaurant_admin") {
        throwError(
          "Only users with 'restaurant_admin' role can be assigned",
          403
        );
      }

      if (user.restaurant_id) {
        throwError("User is already assigned to a restaurant", 400);
      }

      const restaurant = await Restaurant.findByPk(restaurantId, {
        transaction: t,
      });
      if (!restaurant) throwError("Restaurant not found", 404);

      user.restaurant_id = restaurant.id;
      await user.save({ transaction: t });

      const managePermission = await sequelize.models.Permission.findOne({
        where: { name: "manage_restaurant" },
        transaction: t,
      });
      if (!managePermission) {
        throwError("Permission 'manage_restaurant' not found", 404);
      }

      const existingPermission = await sequelize.models.UserPermission.findOne({
        where: {
          user_id: user.id,
          permission_id: managePermission.id,
          restaurant_id: restaurant.id,
          granted: true,
        },
        transaction: t,
      });

      if (!existingPermission) {
        await sequelize.models.UserPermission.create(
          {
            user_id: user.id,
            permission_id: managePermission.id,
            restaurant_id: restaurant.id,
            granted: true,
          },
          { transaction: t }
        );
      }

      await t.commit();

      return {
        message: "User assigned to restaurant and permission granted",
        userId: user.id,
        restaurantId: restaurant.id,
      };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async assignBranchManager(userId, branchId, currentUser) {
    const t = await sequelize.transaction();
    try {
      const user = await User.findByPk(userId, { transaction: t });
      if (!user) throwError("User not found", 404);

      if (user.created_by !== currentUser.id) {
        throwError("You can only assign users you have created", 403);
      }

      const branch = await Branch.findOne({
        where: { id: branchId, restaurant_id: currentUser.restaurant_id },
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

      user.branch_id = branch.id;
      await user.save({ transaction: t });

      const manageBranchPermission = await sequelize.models.Permission.findOne({
        where: { name: "manage_branch" },
        transaction: t,
      });

      if (!manageBranchPermission) {
        throwError("Permission 'manage_branch' not found", 404);
      }

      const existingPermission = await sequelize.models.UserPermission.findOne({
        where: {
          user_id: user.id,
          permission_id: manageBranchPermission.id,
          restaurant_id: currentUser.restaurant_id,
          granted: true,
        },
        transaction: t,
      });

      if (!existingPermission) {
        await sequelize.models.UserPermission.create(
          {
            user_id: user.id,
            permission_id: manageBranchPermission.id,
            restaurant_id: currentUser.restaurant_id,
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
