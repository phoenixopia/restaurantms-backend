"use strict";

const validator = require("validator");
const throwError = require("../../utils/throwError");
const {
  Branch,
  Restaurant,
  Location,
  ContactInfo,
  User,
  sequelize,
} = require("../../models");

async function validateManagerByEmail(email, userId, transaction) {
  const manager = await User.findOne({ where: { email }, transaction });
  if (!manager) throwError("Manager user not found with this email");
  return manager;
}

const BranchService = {
  async createBranch(payload, userId, restaurantId, branchLimit) {
    const transaction = await sequelize.transaction();
    try {
      // Validate user ownership of the restaurant (ensure user manages or created this restaurant)
      const restaurant = await Restaurant.findOne({
        where: { id: restaurantId, created_by: userId },
        transaction,
      });
      if (!restaurant) {
        throwError("Restaurant not found or access denied", 403);
      }

      // Count existing branches for this restaurant
      const currentCount = await Branch.count({
        where: { restaurant_id: restaurantId },
        transaction,
      });

      if (currentCount >= branchLimit) {
        throwError("Branch limit reached", 403);
      }

      const { manager_email, branch_email, branch_phone, ...branchData } =
        payload;

      let managerId = null;
      if (manager_email) {
        if (!validator.isEmail(manager_email))
          throwError("Invalid manager email format");
        const manager = await validateManagerByEmail(
          manager_email,
          userId,
          transaction
        );
        managerId = manager.id;
      }

      // Create branch
      const branch = await Branch.create(
        {
          ...branchData,
          restaurant_id: restaurantId,
          manager_id: managerId,
        },
        { transaction }
      );

      // Insert contact info
      if (branch_email) {
        if (!validator.isEmail(branch_email))
          throwError("Invalid branch email format");
        await ContactInfo.create(
          {
            restaurant_id: restaurantId,
            module_type: "branch",
            module_id: branch.id,
            type: "email",
            value: branch_email,
            is_primary: true,
          },
          { transaction }
        );
      }

      if (branch_phone) {
        if (!validator.isMobilePhone(branch_phone))
          throwError("Invalid branch phone number format");
        await ContactInfo.create(
          {
            restaurant_id: restaurantId,
            module_type: "branch",
            module_id: branch.id,
            type: "phone",
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
      // Find branch with restaurant and verify user ownership
      const branch = await Branch.findOne({
        where: { id: branchId },
        include: {
          model: Restaurant,
          where: { created_by: userId }, // Validate ownership by creator
          required: true,
        },
        transaction,
      });

      if (!branch) {
        throwError("Branch not found or access denied", 404);
      }

      const allowedUpdates = [
        "name",
        "location_id",
        "manager_email",
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

      // Validate location if updated
      if (updates.location_id) {
        const locationExists = await Location.findByPk(updates.location_id, {
          transaction,
        });
        if (!locationExists) {
          throwError("Specified location not found", 404);
        }
      }

      // Handle manager_email update
      if (updates.manager_email) {
        if (!validator.isEmail(updates.manager_email)) {
          throwError("Invalid manager email format");
        }
        const manager = await validateManagerByEmail(
          updates.manager_email,
          userId,
          transaction
        );
        updates.manager_id = manager.id;
        delete updates.manager_email;
      }

      // Helper to upsert ContactInfo for branch email or phone
      async function upsertContactInfo(type, value) {
        if (value) {
          if (type === "email" && !validator.isEmail(value)) {
            throwError("Invalid branch email format");
          }
          if (type === "phone" && !validator.isMobilePhone(value)) {
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

      // Update other branch fields
      await branch.update(updates, { transaction });

      // Reload branch with contact info and manager
      const updatedBranch = await Branch.findByPk(branchId, {
        include: [
          { model: ContactInfo, required: false },
          { model: User, as: "manager" },
        ],
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

      // Verify ownership by checking if user owns the restaurant linked to this branch
      const user = await User.findByPk(userId, { transaction });
      if (!user || user.restaurant_id !== branch.restaurant_id) {
        throwError("Access denied", 403);
      }

      // Delete branch (cascade will handle contact info)
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
  }) {
    const offset = (page - 1) * limit;

    const where = {};
    if (restaurantId) {
      where.restaurant_id = restaurantId;
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
          attributes: ["id", "name", "email"],
          required: false,
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

  async getBranchById(branchId) {
    const branch = await Branch.findByPk(branchId, {
      include: [
        {
          model: Location,
          attributes: ["id", "name", "address", "latitude", "longitude"],
        },
        {
          model: ContactInfo,
          attributes: ["id", "type", "value", "is_primary"],
          required: false,
        },
        {
          model: User,
          as: "manager",
          attributes: ["id", "name", "email"],
          required: false,
        },
      ],
    });

    if (!branch) {
      throwError("Branch not found", 404);
    }

    return branch;
  },
};

module.exports = BranchService;
