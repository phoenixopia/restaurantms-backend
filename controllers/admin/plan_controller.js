const { Plan, sequelize } = require("../../models");
const capitalizeFirstLetter = require("../../utils/capitalizeFirstLetter");
const { Op } = require("sequelize");

const listPlans = async (req, res) => {
  try {
    const plans = await Plan.findAll();

    return res.status(200).json({
      message: "Plans fetched successfully",
      data: plans,
    });
  } catch (error) {
    console.error("Error fetching plans:", error);
    return res.status(500).json({ message: "Failed to fetch plans" });
  }
};
const getPlanByName = async (req, res) => {
  try {
    const { name } = req.params;
    const plan = await Plan.findOne({ where: { name } });

    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    return res.status(200).json({
      message: "Plan fetched successfully",
      data: plan,
    });
  } catch (error) {
    console.error("Error fetching plan by name:", error);
    return res.status(500).json({ message: "Failed to fetch plan" });
  }
};

const getPlanById = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await Plan.findByPk(id);

    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    return res.status(200).json({
      message: "Plan fetched successfully",
      data: plan,
    });
  } catch (error) {
    console.error("Error fetching plan by ID:", error);
    return res.status(500).json({ message: "Failed to fetch plan" });
  }
};

const createPlan = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      name,
      max_locations,
      max_staff,
      max_users,
      max_kds,
      kds_enabled,
      price,
    } = req.body;

    const formattedName = capitalizeFirstLetter(name);

    const validNames = ["Basic", "Pro", "Enterprise"];
    if (!validNames.includes(formattedName)) {
      return res.status(400).json({
        message: `Invalid plan name. Must be one of: ${validNames.join(", ")}`,
      });
    }

    const exists = await Plan.findOne({
      where: { name: formattedName },
      transaction: t,
    });

    if (exists) {
      return res.status(400).json({ message: "Plan already exists" });
    }

    const newPlan = await Plan.create(
      {
        name: formattedName,
        max_locations,
        max_staff,
        max_users,
        max_kds,
        kds_enabled,
        price,
        billing_cycle,
      },
      { transaction: t }
    );
    await t.commit;
    return res.status(201).json({
      message: "Plan created successfully",
      data: newPlan,
    });
  } catch (error) {
    await t.rollback();
    console.error("Error creating plan:", error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

const updatePlan = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const updates = req.body;

    const plan = await Plan.findByPk(id, { transaction: t });

    if (!plan) {
      await t.rollback();
      return res.status(404).json({ message: "Plan not found" });
    }

    const allowedFields = [
      "name",
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
        return res
          .status(400)
          .json({ message: "Another plan with this name already exists" });
      }
      plan.name = formattedName;
    }

    await plan.save({ transaction: t });
    await t.commit();

    return res.status(200).json({ message: "Plan updated successfully" });
  } catch (error) {
    await t.rollback();
    console.error("Error updating plan:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const deletePlan = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const plan = await Plan.findByPk(id, { transaction: t });

    if (!plan) {
      await t.rollback();
      return res.status(404).json({ message: "Plan not found" });
    }
    await plan.destroy({ transaction: t });
    await t.commit();
    return res.status(200).json({ message: "Plan deleted successfully" });
  } catch (error) {
    console.error("Error deleting plan:", error);
    return res.status(500).json({ message: "Failed to delete plan" });
  }
};

module.exports = {
  listPlans,
  getPlanByName,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
};
