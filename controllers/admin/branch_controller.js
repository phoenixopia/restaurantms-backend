const { Branch } = require("../models");
const getBranchStatusByTime = require("../utils/getBranchStatusByTime");

exports.createBranch = async (req, res) => {
  try {
    const {
      restaurant_id,
      location_id,
      name,
      manager_id,
      phone_number,
      email,
      opening_time,
      closing_time,
    } = req.body;

    const status = getBranchStatusByTime(opening_time, closing_time);

    const branch = await Branch.create({
      restaurant_id,
      location_id,
      name,
      manager_id,
      phone_number,
      email,
      status,
      opening_time,
      closing_time,
    });

    return res.status(201).json({
      success: true,
      data: branch,
    });
  } catch (error) {
    console.error("Create Branch Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getAllBranches = async (req, res) => {
  try {
    const branches = await Branch.findAll();
    return res.status(200).json({
      success: true,
      data: branches,
    });
  } catch (error) {
    console.error("Fetch Branches Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getBranchById = async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findByPk(id);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: branch,
    });
  } catch (error) {
    console.error("Get Branch Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
exports.getAllBranches = async (req, res) => {
  try {
    const { status } = req.query;

    const whereClause = {};
    if (status) {
      whereClause.status = status;
    }

    const branches = await Branch.findAll({
      where: whereClause,
    });

    res.status(200).json({
      success: true,
      data: branches,
    });
  } catch (err) {
    console.error("Get Branches Error:", err);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: err.message,
    });
  }
};

exports.updateBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      restaurant_id,
      location_id,
      name,
      manager_id,
      phone_number,
      email,
      opening_time,
      closing_time,
    } = req.body;

    const branch = await Branch.findByPk(id);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    const status = getBranchStatusByTime(
      opening_time || branch.opening_time,
      closing_time || branch.closing_time
    );

    await branch.update({
      restaurant_id,
      location_id,
      name,
      manager_id,
      phone_number,
      email,
      opening_time,
      closing_time,
      status,
    });

    return res.status(200).json({
      success: true,
      data: branch,
    });
  } catch (error) {
    console.error("Update Branch Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteBranch = async (req, res) => {
  try {
    const { id } = req.params;

    const branch = await Branch.findByPk(id);
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    await branch.destroy();

    return res.status(204).send();
  } catch (error) {
    console.error("Delete Branch Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
