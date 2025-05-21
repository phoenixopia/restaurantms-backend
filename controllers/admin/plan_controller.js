const { Plan } = require("../../models/index");


// === GET ALL USERS ===
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


// === CREATE A PLAN ===
exports.createPlan = async (req, res) => {
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
        success: false,
        message: "Invalid plan name. Must be Basic, Pro, or Enterprise",
      });
    }
    const existingPlan = await Plan.findOne({ where: { name } });
    if (existingPlan) {
      return res.status(400).json({success: false, message: "Plan already exists" });
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
    return res.status(201).json({ success: true, message: "Plan created successfully", data: newPlan });
  } catch (error) {
    console.error("Error creating plan:", error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};


// === UPDATE A PLAN ===
exports.updatePlan = async (req, res) => {
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

exports.deletePlan = async (req, res) => {
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
