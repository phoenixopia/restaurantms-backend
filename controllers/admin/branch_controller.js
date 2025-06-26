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
} = require("../../models");
const { validateManagerByEmail } = require("../../utils/validateManager");

// for restaurant admin
exports.createBranch = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { restaurantId } = req.restaurantData;
    const { manager_email, ...branchData } = req.body;

    const currentCount = await Branch.count({
      where: { restaurant_id: restaurantId },
      transaction,
    });

    if (currentCount >= req.restaurantData.branchLimit) {
      throw new Error("Branch limit reached during final validation");
    }

    let managerId = null;
    if (manager_email) {
      if (!validator.isEmail(manager_email)) {
        throw new Error("Invalid manager email format");
      }

      const manager = await validateManagerByEmail(
        manager_email,
        req.user.id,
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
    return res.status(201).json({
      success: true,
      data: branch,
      usage: {
        limit: req.restaurantData.branchLimit,
        used: currentCount + 1,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Branch creation failed:", error);
    const statusCode = error.message.includes("limit reached") ? 402 : 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

// for restaurant admin plus managers
exports.getAdminBranches = async (req, res) => {
  try {
    const userId = req.user.id;
    const restaurantId = req.params.restaurantId;
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const restaurant = await Restaurant.findOne({
      where: { id: restaurantId, created_by: userId },
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found or access denied",
      });
    }

    const { data: branches, meta } = await Branch.paginate({
      page,
      limit,
      where: {
        restaurant_id: restaurantId,
        ...(search && {
          name: { [Op.iLike]: `%${search}%` },
        }),
      },
      include: [{ model: Location }, { model: User, as: "manager" }],
      order: [["created_at", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: branches,
      meta,
    });
  } catch (error) {
    console.error("Error fetching admin branches:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch branches",
    });
  }
};

// all branches under a restaurant for customers
exports.getAllBranchesUnderRestaurant = async (req, res) => {
  try {
    if (!req.branches) {
      return res
        .status(500)
        .json({ success: false, message: "Branches data missing." });
    }
    return res.status(200).json({
      success: true,
      data: req.branches,
    });
  } catch (error) {
    console.error("Error responding with branches:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

//  for admin,staff .... managers
exports.getBranchById = async (req, res) => {
  try {
    const { branchId } = req.params;
    const userId = req.user.id;

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
      return res.status(404).json({
        success: false,
        message: "Branch not found or access denied",
      });
    }

    return res.status(200).json({
      success: true,
      data: branch,
    });
  } catch (error) {
    console.error("Error fetching branch:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch branch",
    });
  }
};

// only for restaurant admin
exports.updateBranch = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { branchId } = req.params;
    const userId = req.user.id;
    const updates = { ...req.body };
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
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Branch not found or access denied",
      });
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

    const invalidUpdates = Object.keys(updates).filter(
      (field) => !allowedUpdates.includes(field)
    );

    if (invalidUpdates.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Invalid fields: ${invalidUpdates.join(", ")}`,
      });
    }
    if (updates.location_id) {
      const locationExists = await Location.findByPk(updates.location_id, {
        transaction,
      });
      if (!locationExists) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Specified location not found",
        });
      }
    }
    if (updates.email && !validator.isEmail(updates.email)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }
    if (
      updates.phone_number &&
      !validator.isMobilePhone(updates.phone_number)
    ) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid phone number format",
      });
    }
    if (updates.manager_email) {
      if (!validator.isEmail(updates.manager_email)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Invalid manager email format",
        });
      }

      try {
        const manager = await validateManagerByEmail(
          updates.manager_email,
          userId,
          transaction
        );
        updates.manager_id = manager.id;
      } catch (error) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
    }
    delete updates.manager_email;
    await branch.update(updates, { transaction });
    const updatedBranch = await Branch.findByPk(branchId, {
      include: [Location, { model: User, as: "manager" }],
      transaction,
    });

    await transaction.commit();
    return res.status(200).json({
      success: true,
      data: updatedBranch,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating branch:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update branch",
      error: error.message,
    });
  }
};

// only for restaurant admin
exports.deleteBranch = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { branchId } = req.params;
    const userId = req.user.id;

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
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Branch not found or access denied",
      });
    }

    await branch.destroy({ transaction });
    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Branch deleted successfully",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error deleting branch:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete branch",
      error: error.message,
    });
  }
};

/*
create_branch
view_admin_branches
view_customer_branches
view_branch_by_id
update_branch
delete_branch
*/
