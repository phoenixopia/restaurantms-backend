const { Plan, sequelize } = require("../../models/index");
const { capitalizeFirstLetter } = require("../../utils/capitalizeFirstLetter");
const { Op } = require("sequelize");


// === GET ALL PLANS ===
exports.listPlans = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const pageSize = parseInt(limit, 10) || 10;
    const dataCount = await Plan.count();
    const totalPages = Math.ceil(dataCount / pageSize);
    const data = await Plan.findAll({
      offset: (pageNumber - 1) * pageSize,
      limit: pageSize,
      order: [['updatedAt', 'DESC']], 
    });

    if(!data){
      return res.status(404).json({success: false, message: "No plan found." });
    }

    return res.status(200).json({ 
      success: true, 
      data,
      pagination: { total: dataCount, page: pageNumber, pageSize, totalPages,}
    });
  } catch (error) {
    console.error('Get All Plans Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error.', error: error.message });}
};


// === GET PLAN BY NAME ===
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


// === GET PLAN BY ID ===
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

// === UPDATE PLAN ===
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


// === DELETE PLAN ===
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
