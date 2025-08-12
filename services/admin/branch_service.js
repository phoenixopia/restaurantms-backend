"use strict";

const validator = require("validator");
const throwError = require("../../utils/throwError");
const {
  Branch,
  Restaurant,
  Location,
  ContactInfo,
  User,
  MenuCategory,
  MenuItem,
  sequelize,
} = require("../../models");

const { validateManagerById } = require("../../utils/validateManager");

const BranchService = {
  async createBranch(payload, userId, restaurantId, branchLimit) {
    const transaction = await sequelize.transaction();
    try {
      const {
        manager_id,
        branch_email,
        branch_phone,
        main_branch,
        address,
        latitude,
        longitude,
        opening_time,
        closing_time,
        name,
        status,
      } = payload;

      if (!address || !latitude || !longitude) {
        throwError("Address, latitude, and longitude are required", 400);
      }

      const restaurant = await Restaurant.findByPk(restaurantId, {
        transaction,
      });
      if (!restaurant) throwError("Restaurant not found", 403);

      const currentCount = await Branch.count({
        where: { restaurant_id: restaurantId },
        transaction,
      });
      if (currentCount >= branchLimit) {
        throwError("Branch limit reached", 403);
      }

      const location = await Location.create(
        {
          address,
          latitude,
          longitude,
        },
        { transaction }
      );

      let validatedManagerId = null;
      if (manager_id) {
        const manager = await validateManagerById(
          manager_id,
          userId,
          transaction
        );
        validatedManagerId = manager.id;
      }

      if (main_branch === true) {
        const existingMain = await Branch.findOne({
          where: {
            restaurant_id: restaurantId,
            main_branch: true,
          },
          transaction,
        });
        if (existingMain) {
          throwError("Main branch already exists for this restaurant", 400);
        }
      }

      const branch = await Branch.create(
        {
          name,
          status,
          main_branch: !!main_branch,
          opening_time,
          closing_time,
          restaurant_id: restaurantId,
          location_id: location.id,
          manager_id: validatedManagerId,
        },
        { transaction }
      );

      if (branch_email) {
        if (!validator.isEmail(branch_email))
          throwError("Invalid branch email format");
        await ContactInfo.create(
          {
            restaurant_id: restaurantId,
            module_type: "branch",
            module_id: branch.id,
            type: "Email",
            value: branch_email,
            is_primary: true,
          },
          { transaction }
        );
      }

      if (branch_phone) {
        await ContactInfo.create(
          {
            restaurant_id: restaurantId,
            module_type: "branch",
            module_id: branch.id,
            type: "Phone Number ",
            value: branch_phone,
            is_primary: true,
          },
          { transaction }
        );
      }

      await transaction.commit();

      return {
        ...branch.toJSON(),
        usage: {
          limit: branchLimit,
          used: currentCount + 1,
        },
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async updateBranch(branchId, updates, userId) {
    const transaction = await sequelize.transaction();
    try {
      const branch = await Branch.findByPk(branchId, { transaction });
      if (!branch) throwError("Branch not found", 404);

      const user = await User.findByPk(userId, { transaction });
      if (!user) throwError("User not found", 404);

      if (user.restaurant_id !== branch.restaurant_id) {
        throwError("Access denied", 403);
      }

      const allowedUpdates = [
        "name",
        "location_id",
        "branch_email",
        "branch_phone",
        "opening_time",
        "closing_time",
        "status",
      ];

      const invalidFields = Object.keys(updates).filter(
        (field) => !allowedUpdates.includes(field)
      );
      if (invalidFields.length > 0) {
        throwError(`Invalid fields: ${invalidFields.join(", ")}`);
      }

      if (updates.location_id) {
        const locationExists = await Location.findByPk(updates.location_id, {
          transaction,
        });
        if (!locationExists) {
          throwError("Specified location not found", 404);
        }
      }

      async function upsertContactInfo(type, value) {
        if (value) {
          if (type === "email" && !validator.isEmail(value)) {
            throwError("Invalid branch email format");
          }

          if (type === "phone" && typeof value !== "string") {
            throwError("Invalid branch phone number format");
          }

          const existing = await ContactInfo.findOne({
            where: {
              module_type: "branch",
              module_id: branchId,
              type,
            },
            transaction,
          });

          if (existing) {
            await existing.update({ value }, { transaction });
          } else {
            await ContactInfo.create(
              {
                restaurant_id: branch.restaurant_id,
                module_type: "branch",
                module_id: branchId,
                type,
                value,
                is_primary: true,
              },
              { transaction }
            );
          }
        }
      }

      if ("branch_email" in updates) {
        await upsertContactInfo("email", updates.branch_email);
        delete updates.branch_email;
      }

      if ("branch_phone" in updates) {
        await upsertContactInfo("phone", updates.branch_phone);
        delete updates.branch_phone;
      }

      await branch.update(updates, { transaction });

      // Reload updated branch with contact info and manager
      const updatedBranch = await Branch.findByPk(branchId, {
        include: [{ model: ContactInfo, required: false }],
        transaction,
      });

      await transaction.commit();
      return updatedBranch;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async deleteBranch(branchId, userId) {
    const transaction = await sequelize.transaction();
    try {
      const branch = await Branch.findByPk(branchId, { transaction });
      if (!branch) throwError("Branch not found", 404);

      const user = await User.findByPk(userId, { transaction });
      if (!user || user.restaurant_id !== branch.restaurant_id) {
        throwError("Access denied", 403);
      }

      await branch.destroy({ transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async getAllBranches({
    page = 1,
    limit = 10,
    restaurantId,
    order = [["created_at", "DESC"]],
    user,
  }) {
    const offset = (page - 1) * limit;

    const where = {};

    if (restaurantId) {
      where.restaurant_id = restaurantId;
    }

    if (user.role_name === "staff" && user.branch_id) {
      where.id = user.branch_id;
    }

    const { count, rows } = await Branch.findAndCountAll({
      where,
      limit,
      offset,
      order,
      include: [
        {
          model: Location,
          attributes: ["id", "address", "latitude", "longitude"],
        },
        {
          model: ContactInfo,
          attributes: ["id", "type", "value", "is_primary"],
          required: false,
        },
        {
          model: User,
          as: "manager",
          attributes: ["id", "first_name", "last_name", "email"],
          required: false,
        },
        {
          model: MenuCategory,
          attributes: { exclude: ["created_at", "updated_at"] },
          include: [
            {
              model: MenuItem,
              attributes: { exclude: ["created_at", "updated_at"] },
            },
          ],
        },
      ],
    });

    return {
      data: rows,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        pageSize: limit,
      },
    };
  },

  async getBranchById(branchId, user) {
    const branch = await Branch.findByPk(branchId, {
      include: [
        {
          model: Location,
          attributes: ["id", "address", "latitude", "longitude"],
        },
        {
          model: ContactInfo,
          attributes: ["id", "type", "value", "is_primary"],
          required: false,
        },
        {
          model: User,
          as: "manager",
          attributes: ["id", "first_name", "last_name", "email"],
          required: false,
        },
        {
          model: MenuCategory,
          attributes: { exclude: ["created_at", "updated_at"] },
          include: [
            {
              model: MenuItem,
              attributes: { exclude: ["created_at", "updated_at"] },
              limit: 10,
              order: [["name", "ASC"]],
            },
          ],
        },
      ],
    });

    if (!branch) {
      throwError("Branch not found", 404);
    }

    if (!user) throwError("User not found", 404);

    if (user.role_name === "staff") {
      if (user.branch_id !== branch.id) {
        throwError("Access denied - Not your assigned branch", 403);
      }
    } else {
      if (user.restaurant_id !== branch.restaurant_id) {
        throwError(
          "Access denied - Branch does not belong to your restaurant",
          403
        );
      }
    }

    return branch;
  },

  // async addBranchContactInfo(branchId, data, user) {
  //   const transaction = await sequelize.transaction();

  //   try {
  //     const branch = await Branch.findByPk(branchId, { transaction });
  //     if (!branch) throwError("Branch not found", 404);

  //     const dbUser = await User.findByPk(user.id, { transaction });
  //     if (!dbUser) throwError("User not found", 404);

  //     if (dbUser.role_name === "staff") {
  //       if (dbUser.branch_id !== branch.id) {
  //         throwError("Access denied - Not your assigned branch", 403);
  //       }
  //     } else {
  //       if (dbUser.restaurant_id !== branch.restaurant_id) {
  //         throwError(
  //           "Access denied - Branch doesn't belong to your restaurant",
  //           403
  //         );
  //       }
  //     }

  //     const { type, value, is_primary = true } = data;

  //     if (!type || !value) {
  //       throwError("Both 'type' and 'value' are required");
  //     }

  //     const normalizedType = type.trim().toLowerCase();

  //     const existing = await ContactInfo.findOne({
  //       where: {
  //         module_type: "branch",
  //         module_id: branchId,
  //         type: normalizedType,
  //       },
  //       transaction,
  //     });

  //     let contactInfo;

  //     if (existing) {
  //       contactInfo = await existing.update(
  //         { value, is_primary },
  //         { transaction }
  //       );
  //     } else {
  //       contactInfo = await ContactInfo.create(
  //         {
  //           restaurant_id: branch.restaurant_id,
  //           module_type: "branch",
  //           module_id: branchId,
  //           type: normalizedType,
  //           value,
  //           is_primary,
  //         },
  //         { transaction }
  //       );
  //     }

  //     await transaction.commit();
  //     return contactInfo;
  //   } catch (error) {
  //     await transaction.rollback();
  //     throw error;
  //   }
  // },

  async toggleBranchStatus(branchId, status, user) {
    const ALLOWED_STATUSES = ["active", "inactive", "under_maintenance"];
    const transaction = await sequelize.transaction();

    try {
      if (!ALLOWED_STATUSES.includes(status)) {
        throwError("Invalid status", 400);
      }

      const branch = await Branch.findByPk(branchId, { transaction });
      if (!branch) throwError("Branch not found", 404);

      if (!user) throwError("User not found", 404);

      if (user.role_name === "staff") {
        if (user.branch_id !== branch.id) {
          throwError("Access denied - Not your assigned branch", 403);
        }
      } else {
        if (user.restaurant_id !== branch.restaurant_id) {
          throwError(
            "Access denied - Branch doesn't belong to your restaurant",
            403
          );
        }
      }

      await branch.update({ status }, { transaction });
      await transaction.commit();

      return branch;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};

module.exports = BranchService;
