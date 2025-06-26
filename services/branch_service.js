const { Op } = require("sequelize");
const validator = require("validator");
const {
  Branch,
  Restaurant,
  Location,
  User,
  Subscription,
  Plan,
  sequelize,
} = require("../models");
const { validateManagerByEmail } = require("../utils/validateManager");

class BranchService {
  async createBranch(payload, userId, restaurantId, branchLimit) {
    const transaction = await sequelize.transaction();
    try {
      const { manager_email, ...branchData } = payload;

      const currentCount = await Branch.count({
        where: { restaurant_id: restaurantId },
        transaction,
      });

      if (currentCount >= branchLimit) {
        throw new Error("Branch limit reached");
      }

      let managerId = null;
      if (manager_email) {
        if (!validator.isEmail(manager_email)) {
          throw new Error("Invalid manager email format");
        }

        const manager = await validateManagerByEmail(
          manager_email,
          userId,
          transaction
        );
        managerId = manager.id;
      }

      const branch = await Branch.create(
        {
          ...branchData,
          restaurant_id: restaurantId,
          manager_id: managerId,
        },
        { transaction }
      );

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
  }

  async getAdminBranches(restaurantId, userId, query) {
    const { search = "", page = 1, limit = 10 } = query;

    const restaurant = await Restaurant.findOne({
      where: { id: restaurantId, created_by: userId },
    });

    if (!restaurant) {
      throw new Error("Restaurant not found or access denied");
    }

    const { data: branches, meta } = await Branch.paginate({
      page: parseInt(page),
      limit: parseInt(limit),
      where: {
        restaurant_id: restaurantId,
        ...(search && {
          name: { [Op.iLike]: `%${search}%` },
        }),
      },
      include: [{ model: Location }, { model: User, as: "manager" }],
      order: [["created_at", "DESC"]],
    });

    return { data: branches, meta };
  }

  async getBranchById(branchId, userId) {
    const branch = await Branch.findOne({
      where: { id: branchId },
      include: [
        {
          model: Restaurant,
          where: { created_by: userId },
          required: true,
          attributes: [],
          include: [
            {
              model: Subscription,
              attributes: ["plan_id", "expires_at"],
              include: [Plan],
            },
          ],
        },
        {
          model: Location,
          attributes: ["name", "address", "latitude", "longitude"],
        },
      ],
    });

    if (!branch) {
      throw new Error("Branch not found or access denied");
    }

    return branch;
  }

  async getAllBranchesUnderRestaurant(restaurantId) {
    const branches = await Branch.findAll({
      where: {
        restaurant_id: restaurantId,
        status: "active",
      },
      include: [
        {
          model: Location,
          attributes: ["name", "address", "latitude", "longitude"],
        },
      ],
      order: [["created_at", "ASC"]],
    });

    return branches;
  }

  async updateBranch(branchId, updates, userId) {
    const transaction = await sequelize.transaction();
    try {
      const branch = await Branch.findOne({
        where: { id: branchId },
        include: {
          model: Restaurant,
          where: { created_by: userId },
          required: true,
        },
        transaction,
      });

      if (!branch) {
        throw new Error("Branch not found or access denied");
      }

      const allowedUpdates = [
        "name",
        "location_id",
        "manager_email",
        "phone_number",
        "email",
        "opening_time",
        "closing_time",
        "status",
      ];

      const invalidFields = Object.keys(updates).filter(
        (field) => !allowedUpdates.includes(field)
      );

      if (invalidFields.length > 0) {
        throw new Error(`Invalid fields: ${invalidFields.join(", ")}`);
      }

      if (updates.location_id) {
        const locationExists = await Location.findByPk(updates.location_id, {
          transaction,
        });
        if (!locationExists) {
          throw new Error("Specified location not found");
        }
      }

      if (updates.email && !validator.isEmail(updates.email)) {
        throw new Error("Invalid email format");
      }

      if (
        updates.phone_number &&
        !validator.isMobilePhone(updates.phone_number)
      ) {
        throw new Error("Invalid phone number format");
      }

      if (updates.manager_email) {
        if (!validator.isEmail(updates.manager_email)) {
          throw new Error("Invalid manager email format");
        }

        const manager = await validateManagerByEmail(
          updates.manager_email,
          userId,
          transaction
        );

        updates.manager_id = manager.id;
      }

      delete updates.manager_email;

      await branch.update(updates, { transaction });

      const updatedBranch = await Branch.findByPk(branchId, {
        include: [Location, { model: User, as: "manager" }],
        transaction,
      });

      await transaction.commit();
      return updatedBranch;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  async deleteBranch(branchId, userId) {
    const transaction = await sequelize.transaction();
    try {
      const branch = await Branch.findOne({
        where: { id: branchId },
        include: {
          model: Restaurant,
          where: { created_by: userId },
          required: true,
        },
        transaction,
      });

      if (!branch) {
        throw new Error("Branch not found or access denied");
      }

      await branch.destroy({ transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  async getBranchMenuWithCategories(branchId, restaurantId) {
    const branch = await Branch.findOne({
      where: {
        id: branchId,
        restaurant_id: restaurantId,
        status: "active",
      },
      include: [
        {
          model: Restaurant,
          include: ["Menu"],
        },
      ],
    });

    if (!branch) {
      throw new Error("Branch not found or does not belong to this restaurant");
    }

    const menu = branch.Restaurant?.Menu;
    if (!menu) {
      throw new Error("Menu not found for this restaurant");
    }

    const menuCategories = await sequelize.models.MenuCategory.findAll({
      where: {
        branch_id: branch.id,
        menu_id: menu.id,
        is_active: true,
      },
      include: [
        {
          model: sequelize.models.MenuItem,
          where: { is_active: true },
          required: false,
        },
      ],
      order: [["sort_order", "ASC"]],
    });

    return {
      branch: {
        id: branch.id,
        name: branch.name,
        status: branch.status,
        opening_time: branch.opening_time,
        closing_time: branch.closing_time,
        is_open: branch.isCurrentlyOpen(), // <-- added
      },
      menu: {
        id: menu.id,
        name: menu.name,
        description: menu.description,
      },
      menu_categories: menuCategories,
    };
  }
}

module.exports = BranchService;
