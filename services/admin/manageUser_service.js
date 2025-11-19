"use strict";

const {
  User,
  Role,
  RoleTag,
  Restaurant,
  Branch,
  Customer,
  Plan,
  PlanLimit,
  Permission,
  RolePermission,
  ActivityLog,
  Order,
  UploadedFile,
  Video,
  Payment,
  Notification,
  SupportTicket,
  Subscription,
  sequelize,
} = require("../../models");
const throwError = require("../../utils/throwError");
const { sendUserCredentialsEmail } = require("../../utils/sendEmail");
const { sendSMS } = require("../../utils/sendSMS");
const logActivity = require("../../utils/logActivity");
const { Op} = require("sequelize");


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

      if (!first_name || !last_name || !password || !role_id)
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
          restaurant_id: creator.restaurant_id,
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

      if (user.created_by !== deleterId) {
        throwError("You are not authorized to delete this user", 403);
      }

      await ActivityLog.destroy({ where: { user_id: id }, transaction: t });
      await SupportTicket.destroy({ where: { user_id: id }, transaction: t });
      await Notification.destroy({
        where: { target_user_id: id },
        transaction: t,
      });
      await Notification.destroy({ where: { created_by: id }, transaction: t });
      await Payment.destroy({ where: { user_id: id }, transaction: t });
      await Video.destroy({ where: { uploaded_by: id }, transaction: t });
      await UploadedFile.destroy({
        where: { uploaded_by: id },
        transaction: t,
      });
      await Order.destroy({ where: { user_id: id }, transaction: t });

      await User.destroy({ where: { created_by: id }, transaction: t });

      // finally delete the user
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
        "createdAt",
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
      order: [["createdAt", "DESC"]],
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


async getCreatedCustomers(userId, query) {
  const page   = parseInt(query.page, 10) || 1;
  const limit  = parseInt(query.limit, 10) || 10;
  const offset = (page - 1) * limit;

  const search = typeof query.search === "string"
    ? query.search.trim().toLowerCase()
    : "";

  const where = {
    
    ...(search && {
      [Op.or]: [
        sequelize.where(
          sequelize.fn("LOWER", sequelize.col("first_name")),
          { [Op.like]: `%${search}%` }
        ),
        sequelize.where(
          sequelize.fn("LOWER", sequelize.col("last_name")),
          { [Op.like]: `%${search}%` }
        ),
        { phone_number: { [Op.like]: `%${search}%` } },
      ]
    })
  };

  const { rows, count } = await Customer.findAndCountAll({
    where,
    attributes: [
      "id","email","first_name","last_name",
      "phone_number","profile_picture",
      "is_active","createdAt"
    ],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });

  return {
    total: count,
    page,
    pages: Math.ceil(count / limit),
    data: rows.map(u => ({
      id: u.id,
      email: u.email,
      first_name: u.first_name,
      last_name: u.last_name,
      full_name: `${u.first_name || ""} ${u.last_name || ""}`.trim(),
      phone_number: u.phone_number,
      profile_picture: u.profile_picture,
      is_active: u.is_active,
      created_at: u.createdAt,
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


  async update(id, data, updaterId) {
  const t = await sequelize.transaction();

  try {
    const {
      role_id,      
      first_name,
      last_name,
      email,
      phone_number,
      creatorMode,   
    } = data;

   
    const user = await User.findByPk(id, {
      transaction: t,
      include: [
        { model: Role, attributes: ['id', 'name'] },
        { model: RoleTag, attributes: ['id', 'name'] },
      ],
    });

    if (!user) throwError('User not found', 404);

 
    if (user.created_by !== updaterId) {
      throwError('You are not authorized to update this staff member', 403);
    }

 
    if (role_id) {
      const role = await Role.findOne({
        where: { id: role_id, created_by: updaterId },
        transaction: t,
      });
      if (!role) {
        throwError('Role not found or does not belong to your restaurant', 404);
      }
      user.role_id = role.id;
      user.role_tag_id = role.role_tag_id;
    }

    
    if (creatorMode === 'email') {
      user.phone_number = null;           
      if (email !== undefined) user.email = email;
    } 
    else if (creatorMode === 'phone') {
      user.email = null;                
      if (phone_number !== undefined) user.phone_number = phone_number;
    } 
    else {
     
      if (email !== undefined) user.email = email;
      if (phone_number !== undefined) user.phone_number = phone_number;
    }


    if (first_name !== undefined) user.first_name = first_name;
    if (last_name !== undefined) user.last_name = last_name;

 
    await user.save({ transaction: t });
    await t.commit();


    return {
      success: true,
      message: 'Staff updated successfully',
      data: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone_number: user.phone_number,
        profile_picture: user.profile_picture,
        is_active: user.is_active,
        Role: { id: user.Role.id, name: user.Role.name },
        RoleTag: { id: user.RoleTag.id, name: user.RoleTag.name },
      },
    };
  } catch (err) {
    await t.rollback();
    throw err;
  }
},

async updateSuperAdminProfile(superAdminId, data, req = null) {
  let t;
  try {
    t = await sequelize.transaction();

    const { email, phone_number, password, current_password } = data;

    const user = await User.findByPk(superAdminId, {
      transaction: t,
      include: [{ model: RoleTag }]
    });

    if (!user) throwError("Super admin not found", 404);

    const isSuperAdmin = user.RoleTag?.name === 'super_admin';

    
    if (password) {
      if (!current_password) {
        throwError("Current password is required to set a new password", 400);
      }
      const isMatch = await user.comparePassword(current_password);
      if (!isMatch) throwError("Current password is incorrect", 401);

      user.password = password; 
    }

    
    if (email !== undefined && email !== user.email) {
      const existing = await User.findOne({
        where: { email },
        transaction: t,
      });
      if (existing) throwError("This email is already taken", 409);

      user.email = email;

      
      if (!isSuperAdmin) {
        user.email_verified_at = null;
      }
      
    }

    
    if (phone_number !== undefined && phone_number !== user.phone_number) {
      const existing = await User.findOne({
        where: { phone_number },
        transaction: t,
      });
      if (existing) throwError("This phone number is already taken", 409);

      user.phone_number = phone_number;

      if (!isSuperAdmin) {
        user.phone_verified_at = null;
      }
    }

    await user.save({ transaction: t });
    await t.commit();
    t = null;

    
    try {
      await logActivity({
        user_id: user.id,
        action: "update_own_profile",
        description: `Super admin updated profile (${password ? 'password, ' : ''}${email ? 'email, ' : ''}${phone_number ? 'phone' : ''})`.replace(/, $/, ''),
        ip_address: req?.ip || "unknown",
        user_agent: req?.headers["user-agent"] || "unknown",
      });
    } catch (e) {
      console.error("Activity log failed:", e);
    }

    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone_number: user.phone_number,
      email_verified_at: user.email_verified_at,
      phone_verified_at: user.phone_verified_at,
      updated_at: user.updatedAt,
    };

  } catch (err) {
    if (t) {
      try { await t.rollback(); } catch {}
    }
    throw err;
  }
},

async updateStaffProfile(id, data, req = null) {
  let t;
  try {
    t = await sequelize.transaction();

    const { email, phone_number, password, current_password } = data;

    const user = await User.findByPk(id, {
      transaction: t,
      include: [{ model: RoleTag }]
    });

    if (!user) throwError("Super admin not found", 404);


    
    if (password) {
      if (!current_password) {
        throwError("Current password is required to set a new password", 400);
      }
      const isMatch = await user.comparePassword(current_password);
      if (!isMatch) throwError("Current password is incorrect", 401);

      user.password = password; 
    }

    

    await user.save({ transaction: t });
    await t.commit();
    t = null;

    
    try {
      await logActivity({
        user_id: user.id,
        action: "update_own_profile",
        description: `uiser updated profile (${password ? 'password, ' : ''}${email ? 'email, ' : ''}${phone_number ? 'phone' : ''})`.replace(/, $/, ''),
        ip_address: req?.ip || "unknown",
        user_agent: req?.headers["user-agent"] || "unknown",
      });
    } catch (e) {
      console.error("Activity log failed:", e);
    }

    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone_number: user.phone_number,
      email_verified_at: user.email_verified_at,
      phone_verified_at: user.phone_verified_at,
      updated_at: user.updatedAt,
    };

  } catch (err) {
    if (t) {
      try { await t.rollback(); } catch {}
    }
    throw err;
  }
},


async updateCustomer(customerId, data, updaterId) {
  const t = await sequelize.transaction();
  try {
    const customer = await Customer.findByPk(customerId, { transaction: t });
    if (!customer) throwError("Customer not found", 404);

    const { first_name, last_name, email, phone_number, profile_picture, notes } = data;

    
    if (first_name !== undefined) customer.first_name = first_name.trim();
    if (last_name !== undefined) customer.last_name = last_name.trim();
    if (email !== undefined) {
      if (email && email !== customer.email) {
        const exists = await Customer.findOne({ where: { email }, transaction: t });
        if (exists) throwError("Email already taken", 409);
        customer.email = email;
      }
    }
    if (phone_number !== undefined) {
      if (phone_number && phone_number !== customer.phone_number) {
        const exists = await Customer.findOne({ where: { phone_number }, transaction: t });
        if (exists) throwError("Phone number already taken", 409);
        customer.phone_number = phone_number;
      }
    }
    if (profile_picture !== undefined) customer.profile_picture = profile_picture;
    if (notes !== undefined) customer.notes = notes;

    await customer.save({ transaction: t });
    await t.commit();

    return {
      success: true,
      message: "Customer updated successfully",
      data: {
        id: customer.id,
        first_name: customer.first_name,
        last_name: customer.last_name,
        full_name: `${customer.first_name} ${customer.last_name}`.trim(),
        email: customer.email,
        phone_number: customer.phone_number,
        profile_picture: customer.profile_picture,
        notes: customer.notes,
        is_active: customer.is_active,
      },
    };
  } catch (err) {
    await t.rollback();
    throw err;
  }
},

async deleteCustomer(customerId, deleterId) {
  const t = await sequelize.transaction();
  try {
    const customer = await Customer.findByPk(customerId, { transaction: t });
    if (!customer) throwError("Customer not found", 404);

    customer.is_active = false;
    customer.deleted_at = new Date(); 
    await customer.save({ transaction: t });

    await logActivity({
      user_id: deleterId,
      action: "delete_customer",
      description: `Deleted customer: ${customer.first_name} ${customer.last_name} (${customer.phone_number || customer.email})`,
    });

    await t.commit();

    return {
      success: true,
      message: "Customer deleted successfully",
      data: { customer_id: customer.id },
    };
  } catch (err) {
    await t.rollback();
    throw err;
  }
},
  
};

module.exports = UserService;
