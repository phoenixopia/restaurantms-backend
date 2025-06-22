const { Plan, sequelize } = require("../../models");
const { capitalizeFirstLetter } = require("../../utils/capitalizeFirstLetter");
const { Op } = require("sequelize");

exports.listPlans = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const paginatedPlans = await Plan.paginate({
      page,
      limit,
      order: [["name", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      message: "Plans fetched successfully",
      data: paginatedPlans.data,
      meta: paginatedPlans.meta,
    });
  } catch (error) {
    console.error("Error fetching plans:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch plans",
    });
  }
};

exports.getPlanByName = async (req, res) => {
  try {
    const { name } = req.params;
    const formattedName = capitalizeFirstLetter(name);

    const plan = await Plan.findOne({ where: { name: formattedName } });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Plan fetched successfully",
      data: plan,
    });
  } catch (error) {
    console.error("Error fetching plan by name:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch plan",
    });
  }
};

exports.getPlanById = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await Plan.findByPk(id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Plan fetched successfully",
      data: plan,
    });
  } catch (error) {
    console.error("Error fetching plan by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch plan",
    });
  }
};
// for feature use
exports.createPlan = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      name,
      max_branches,
      max_locations,
      max_staff,
      max_users,
      max_kds,
      kds_enabled,
      price,
    } = req.body;

    if (!name || price === undefined) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Name and price are required",
      });
    }

    const formattedName = capitalizeFirstLetter(name);

    const existingPlan = await Plan.findOne({
      where: { name: formattedName },
      transaction: t,
    });

    if (existingPlan) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "A plan with this name already exists",
      });
    }

    const newPlan = await Plan.create(
      {
        name: formattedName,
        max_branches,
        max_locations,
        max_staff,
        max_users,
        max_kds,
        kds_enabled,
        price,
      },
      { transaction: t }
    );

    await t.commit();

    return res.status(201).json({
      success: true,
      message: "Plan created successfully",
      data: newPlan,
    });
  } catch (error) {
    await t.rollback();
    console.error("Error creating plan:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create plan",
    });
  }
};

exports.updatePlan = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const updates = req.body;

    const plan = await Plan.findByPk(id, { transaction: t });

    if (!plan) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    const allowedFields = [
      "name",
      "max_branches",
      "max_locations",
      "max_staff",
      "max_users",
      "max_kds",
      "kds_enabled",
      "price",
    ];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        plan[field] = updates[field];
      }
    });

    if (updates.name) {
      const formattedName = capitalizeFirstLetter(updates.name);
      const exists = await Plan.findOne({
        where: {
          name: formattedName,
          id: { [Op.ne]: plan.id },
        },
        transaction: t,
      });
      if (exists) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "Another plan with this name already exists",
        });
      }
      plan.name = formattedName;
    }

    await plan.save({ transaction: t });
    await t.commit();

    return res.status(200).json({
      success: true,
      message: "Plan updated successfully",
    });
  } catch (error) {
    await t.rollback();
    console.error("Error updating plan:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

exports.deletePlan = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const plan = await Plan.findByPk(id, { transaction: t });

    if (!plan) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }
    await plan.destroy({ transaction: t });
    await t.commit();
    return res.status(200).json({
      success: true,
      message: "Plan deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting plan:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete plan",
    });
  }
};
