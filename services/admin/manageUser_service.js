"use strict";

const {
  User,
  Role,
  Restaurant,
  Branch,
  Plan,
  PlanLimit,
  Permission,
  UserPermission,
  Subscription,
  sequelize,
} = require("../../models");
const throwError = require("../../utils/throwError");
const { sendUserCredentialsEmail } = require("../../utils/sendEmail");
const { buildPagination } = require("../../utils/pagination");

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
        if (!restaurant) throwError("Restaurant not found", 400);
      }

      const role = await Role.findOne({
        where: { name: "restaurant_admin" },
        transaction: t,
      });
      if (!role) throwError("Role 'restaurant_admin' not found", 404);

      const whereClause =
        creatorMode === "email" ? { email } : { phone_number };

      if (await User.findOne({ where: whereClause, transaction: t })) {
        const conflictField =
          creatorMode === "email" ? "email" : "phone number";
        throwError(`User with this ${conflictField} already exists`, 409);
      }

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

      const activeSubscription = await Subscription.findOne({
        where: {
          restaurant_id: creator.restaurant_id,
          status: "active",
        },
        order: [["created_at", "DESC"]],
        transaction: t,
      });

      if (!activeSubscription) throwError("No active subscription found", 403);

      const plan = await Plan.findByPk(activeSubscription.plan_id, {
        include: [{ model: PlanLimit }],
        transaction: t,
      });

      const maxStaffLimit = plan.PlanLimits.find(
        (limit) => limit.key === "max_staff"
      );

      if (!maxStaffLimit)
        throwError("Plan does not define max_staff limit", 400);

      const maxStaff = parseInt(maxStaffLimit.value, 10);

      const currentStaffCount = await User.count({
        where: {
          created_by: restaurantAdminId,
        },
        transaction: t,
      });

      if (currentStaffCount >= maxStaff) {
        throwError(
          `You have reached your staff limit (${maxStaff}) for your current subscription plan.`,
          403
        );
      }

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
        throwError(`User with this ${creatorMode} already exists`, 409);

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
      attributes: {
        exclude: [
          "password",
          "confirmation_code",
          "confirmation_code_expires",
          "locked_until",
          "failed_login_attempts",
          "last_login_at",
          "social_provider",
          "social_provider_id",
          "email_verified_at",
          "phone_verified_at",
          "createdAt",
          "updatedAt",
          "created_at",
          "updated_at",
          "password_changed_at",
        ],
      },
      include: [
        {
          model: Role,
          attributes: ["id", "name"],
          include: [
            {
              model: Permission,
              attributes: ["id", "name"],
              through: {
                where: { granted: true },
                attributes: [],
              },
            },
          ],
        },
        {
          model: UserPermission,
          where: { granted: true },
          required: false,
          attributes: ["permission_id"],
          include: [
            {
              model: Permission,
              attributes: ["id", "name"],
            },
          ],
        },
      ],
    });

    if (!user) {
      throwError(
        "User not found or you are not authorized to view this user",
        404
      );
    }

    const userJson = user.toJSON();

    const fromRole =
      userJson.Role?.Permissions?.map(({ id, name }) => ({ id, name })) || [];
    const fromUser =
      userJson.UserPermissions?.map(({ Permission }) => ({
        id: Permission.id,
        name: Permission.name,
      })) || [];

    delete userJson.Role;
    delete userJson.UserPermissions;

    return {
      ...userJson,
      permissions: {
        fromRole,
        fromUser,
      },
    };
  },

  async getAllCreatedUsers(adminId, query = {}) {
    let { page, limit, offset, order } = buildPagination(query);

    if (
      order?.length === 1 &&
      (order[0][0] === "created_at" || order[0][0] === "createdAt")
    ) {
      order = [["created_by", "ASC"]];
    }

    const result = await User.findAndCountAll({
      where: { created_by: adminId },
      limit,
      offset,
      order,
      attributes: {
        exclude: [
          "password",
          "confirmation_code",
          "confirmation_code_expires",
          "locked_until",
          "failed_login_attempts",
          "last_login_at",
          "social_provider",
          "social_provider_id",
          "email_verified_at",
          "phone_verified_at",
          "createdAt",
          "updatedAt",
          "created_at",
          "updated_at",
          "password_changed_at",
        ],
      },
      include: [
        {
          model: Role,
          attributes: ["id", "name"],
          include: [
            {
              model: Permission,
              attributes: ["id", "name"],
              through: { attributes: [] },
            },
          ],
        },
        {
          model: UserPermission,
          where: { granted: true },
          required: false,
          attributes: ["permission_id"],
          include: [
            {
              model: Permission,
              attributes: ["id", "name"],
            },
          ],
        },
      ],
    });

    const formattedUsers = result.rows.map((user) => {
      const userJson = user.toJSON();

      const fromRole =
        userJson.Role?.Permissions?.map(({ id, name }) => ({ id, name })) || [];

      const fromUser =
        userJson.UserPermissions?.map(({ Permission }) => ({
          id: Permission.id,
          name: Permission.name,
        })) || [];

      delete userJson.Role;
      delete userJson.UserPermissions;

      return {
        ...userJson,
        permissions: {
          fromRole,
          fromUser,
        },
      };
    });

    return {
      total: result.count,
      page,
      limit,
      users: formattedUsers,
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
      if (user.branch_id === branch.id)
        throwError("User is already assigned to this branch", 400);
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
        throwError("User already assigned to a restaurant", 400);
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

      if (branch.manager_id === user.id) {
        throwError("This user is already assigned as the branch manager", 409);
      }

      if (branch.manager_id && branch.manager_id !== user.id) {
        throwError("This branch already has a manager assigned", 409);
      }

      branch.manager_id = user.id;
      await branch.save({ transaction: t });

      user.branch_id = branch.id;
      await user.save({ transaction: t });

      const manageBranchPermission = await sequelize.models.Permission.findOne({
        where: { name: "manage_branches" },
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

  async removeBranchManager(branchId, currentUser) {
    const t = await sequelize.transaction();
    try {
      const branch = await Branch.findOne({
        where: { id: branchId, restaurant_id: currentUser.restaurant_id },
        transaction: t,
      });

      if (!branch)
        throwError(
          "Branch not found or does not belong to your restaurant",
          404
        );

      const currentManagerId = branch.manager_id;
      if (!currentManagerId)
        throwError("No manager is assigned to this branch", 400);

      const user = await User.findByPk(currentManagerId, { transaction: t });

      branch.manager_id = null;
      await branch.save({ transaction: t });

      if (user.branch_id === branch.id) {
        user.branch_id = null;
        await user.save({ transaction: t });
      }

      const manageBranchPermission = await sequelize.models.Permission.findOne({
        where: { name: "manage_branches" },
        transaction: t,
      });

      if (manageBranchPermission) {
        await sequelize.models.UserPermission.destroy({
          where: {
            user_id: user.id,
            permission_id: manageBranchPermission.id,
            restaurant_id: currentUser.restaurant_id,
          },
          transaction: t,
        });
      }

      await t.commit();

      return {
        message: "Branch manager removed successfully",
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
