"use strict";

const {
  User,
  Role,
  RoleTag,
  Restaurant,
  Branch,
  Plan,
  PlanLimit,
  Permission,
  RolePermission,
  Subscription,
  sequelize,
} = require("../../models");
const throwError = require("../../utils/throwError");
const { sendUserCredentialsEmail } = require("../../utils/sendEmail");
const { sendSMS } = require("../../utils/sendSMS");

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
        role_id,
      } = data;

      if (!first_name || !last_name || !password || role_id)
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

      const role = await Role.findByPk(role_id, { transaction: t });

      if (!role) throwError("Role not found", 400);

      const roleTagId = role.role_tag_id;

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
          role_tag_id: roleTagId,
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
      } else {
        try {
          await sendSMS(
            phone_number,
            `Hi ${first_name}, welcome to Phoenixopia!\nLogin with: ${phone_number}\nPassword: ${password}\nPlease change your password after login.`
          );
        } catch (error) {
          console.error("SMS send failed:", error);
        }
      }

      return {
        id: newUser.id,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        email: newUser.email,
        phone_number: newUser.phone_number,
        role_id: newUser.role_id,
        role_tag_id: newUser.role_tag_id,
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
        role_id,
        branch_id = null,
        creatorMode,
      } = data;

      if (!first_name || !last_name || !password || !role_id)
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

      // const activeSubscription = await Subscription.findOne({
      //   where: {
      //     restaurant_id: creator.restaurant_id,
      //     status: "active",
      //   },
      //   order: [["created_at", "DESC"]],
      //   transaction: t,
      // });

      // if (!activeSubscription) throwError("No active subscription found", 403);

      // const plan = await Plan.findByPk(activeSubscription.plan_id, {
      //   include: [{ model: PlanLimit }],
      //   transaction: t,
      // });

      // const maxStaffLimit = plan.PlanLimits.find(
      //   (limit) => limit.key === "max_staff"
      // );

      // if (!maxStaffLimit)
      //   throwError("Plan does not define max_staff limit", 400);

      // const maxStaff = parseInt(maxStaffLimit.value, 10);

      // const currentStaffCount = await User.count({
      //   where: {
      //     created_by: restaurantAdminId,
      //   },
      //   transaction: t,
      // });

      // if (currentStaffCount >= maxStaff) {
      //   throwError(
      //     `You have reached your staff limit (${maxStaff}) for your current subscription plan.`,
      //     403
      //   );
      // }

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
        where: { id: data.role_id, created_by: restaurantAdminId },
        transaction: t,
      });
      if (!role)
        throwError("Role not found or does not belong to your restaurant", 404);

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
          role_tag_id: role.role_tag_id,
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
      } else {
        try {
          await sendSMS(
            phone_number,
            `Hi ${first_name}, welcome to Phoenixopia!\nLogin with: ${phone_number}\nPassword: ${password}\nPlease change your password after login.`
          );
        } catch (error) {
          console.error("SMS send failed:", error);
        }
      }

      return {
        id: newUser.id,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        email: newUser.email,
        phone_number: newUser.phone_number,
        role_id: newUser.role_id,
        role_tag_id: newUser.role_tag_id,
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

      console.log(user.created_by, deleterId);

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
      attributes: [
        "id",
        "first_name",
        "last_name",
        "full_name",
        "email",
        "phone_number",
        "profile_picture",
        "is_active",
        "branch_id",
        "restaurant_id",
        "role_id",
      ],
      include: [
        {
          model: Role,
          attributes: [
            "id",
            "name",
            "role_tag_id",
            [
              sequelize.literal(`(
              SELECT COUNT(*)
              FROM role_permissions AS rp
              WHERE rp.role_id = Role.id
            )`),
              "total_permission",
            ],
          ],
          include: [
            {
              model: RoleTag,
              attributes: ["id", "name"],
            },
          ],
        },
        {
          model: Branch,
          attributes: ["id", "name"],
        },
        {
          model: Restaurant,
          attributes: ["id", "restaurant_name"],
        },
      ],
    });

    if (!user) {
      throwError(
        "User not found or you are not authorized to view this user",
        404
      );
    }

    const rolePermissions = await RolePermission.findAll({
      where: { role_id: user.role_id },
      attributes: ["permission_id"],
    });

    const permissionIds = rolePermissions.map((rp) => rp.permission_id);

    const permissions = await Permission.findAll({
      where: { id: permissionIds },
      attributes: ["id", "name"],
    });

    return {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone_number: user.phone_number,
      profile_picture: user.profile_picture,
      is_active: user.is_active,
      role: user.Role
        ? {
            id: user.Role.id,
            name: user.Role.name,
            total_permission: Number(user.Role.dataValues.total_permission),
            role_tag: user.Role.RoleTag
              ? {
                  id: user.Role.RoleTag.id,
                  name: user.Role.RoleTag.name,
                }
              : null,
            permissions: permissions.map((p) => ({
              id: p.id,
              name: p.name,
            })),
          }
        : null,
      branch: {
        id: user.branch_id || null,
        name: user.Branch?.name || null,
      },
      restaurant: {
        id: user.restaurant_id || null,
        name: user.Restaurant?.restaurant_name || null,
      },
    };
  },

  async getAllCreatedUsers(creatorId, query) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const { rows, count } = await User.findAndCountAll({
      where: { created_by: creatorId },
      attributes: [
        "id",
        "email",
        "first_name",
        "last_name",
        "full_name",
        "phone_number",
        "profile_picture",
        "is_active",
        "created_at",
      ],
      include: [
        {
          model: Role,
          attributes: [
            "id",
            "name",
            [
              sequelize.literal(`(
              SELECT COUNT(*)
              FROM role_permissions AS rp
              WHERE rp.role_id = "Role"."id"
            )`),
              "total_permission",
            ],
          ],
        },
        {
          model: RoleTag,
          attributes: ["id", "name"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });

    return {
      total: count,
      page,
      pages: Math.ceil(count / limit),
      data: rows.map((u) => ({
        id: u.id,
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        // full_name: u.full_name,
        phone_number: u.phone_number,
        profile_picture: u.profile_picture,
        is_active: u.is_active,
        Role: u.Role
          ? {
              id: u.Role.id,
              name: u.Role.name,
              total_permission: Number(u.Role.dataValues.total_permission),
            }
          : null,
        RoleTag: u.RoleTag
          ? {
              id: u.RoleTag.id,
              name: u.RoleTag.name,
            }
          : null,
      })),
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
        throwError("User already assigned to this branch", 400);
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
        include: [
          {
            model: Role,
            include: [{ model: RoleTag }],
          },
        ],
        transaction: t,
      });

      if (!user) throwError("User not found", 404);

      if (user.Role?.RoleTag?.name !== "restaurant_admin") {
        throwError(
          "Only users with role tag 'restaurant_admin' can be assigned",
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

      await t.commit();

      return {
        message: "User assigned to restaurant successfully",
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

      await t.commit();

      return {
        message: "User assigned as branch manager successfully",
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

  async updateStaff(id, data, updaterId) {
    const t = await sequelize.transaction();
    try {
      // update only role_id,
      const { role_id } = data;
      if (!role_id) throwError("No fields to update", 400);

      const user = await User.findByPk(id, { transaction: t });
      if (!user) throwError("User not found", 404);

      if (user.created_by !== updaterId) {
        throwError("You are not authorized to update this user", 403);
      }

      const role = await Role.findOne({
        where: { id: role_id, created_by: updaterId },
        transaction: t,
      });
      if (!role)
        throwError("Role not found or does not belong to your restaurant", 404);
      user.role_id = role.id;
      user.role_tag_id = role.role_tag_id;

      await user.save({ transaction: t });
      await t.commit();
      return user;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },
};

module.exports = UserService;
