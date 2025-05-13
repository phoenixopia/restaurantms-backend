const { Plan } = require("../../../models");

const listPlans = async (req, res) => {
  try {
    const plans = await Plan.findAll();

    return res.status(200).json({
      message: "Plans fetched successfully",
      plans,
    });
  } catch (error) {
    console.error("Error fetching plans:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const createPlan = async (req, res) => {
  try {
    const {
      name,
      max_locations,
      max_staff,
      max_users,
      max_kds,
      kds_enabled,
      price,
      billing_cycle,
    } = req.body;

    const formattedName =
      name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

    if (!["Basic", "Pro", "Enterprise"].includes(formattedName)) {
      return res.status(400).json({
        message: "Invalid plan name. Must be Basic, Pro, or Enterprise",
      });
    }
    const existingPlan = await Plan.findOne({ where: { name } });
    if (existingPlan) {
      return res.status(400).json({ message: "Plan already exists" });
    }
    const newPlan = await Plan.create({
      name: formattedName,
      max_locations,
      max_staff,
      max_users,
      max_kds,
      kds_enabled,
      price,
      billing_cycle,
    });
    return res.status(201).json({
      message: "Plan created successfully",
    });
  } catch (error) {
    console.error("Error creating plan:", error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const plan = await Plan.findByPk(id);

    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined) {
        plan[key] = updates[key];
      }
    });

    await plan.save();

    return res.status(200).json({ message: "Plan updated successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await Plan.findByPk(id);
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }
    await plan.destroy();
    return res.status(200).json({ message: "Plan deleted successfully" });
  } catch (error) {
    console.error("Error deleting plan:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

module.exports = {
  listPlans,
  createPlan,
  updatePlan,
  deletePlan,
};
