const { Permission } = require("../../models");
const { Op } = require("sequelize");

const listPermissions = async (req, res) => {
  try {
    const permissions = await Permission.findAll();
    return res.status(200).json(permissions);
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return res.status(500).json({ message: "Failed to retrieve permissions" });
  }
};

const createPermission = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Permission name is required" });
    }

    const existing = await Permission.findOne({ where: { name } });
    if (existing) {
      return res
        .status(409)
        .json({ message: "Permission with this name already exists" });
    }

    const newPermission = await Permission.create({ name, description });
    return res.status(201).json({ message: "Permission created successfully" });
  } catch (error) {
    console.error("Error creating permission:", error);
    return res.status(500).json({ message: "Failed to create permission" });
  }
};

const updatePermission = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const permission = await Permission.findByPk(id);
    if (!permission) {
      return res.status(404).json({ message: "Permission not found" });
    }

    if (name) {
      const duplicate = await Permission.findOne({
        where: { name, id: { [Op.ne]: id } },
      });
      if (duplicate) {
        return res
          .status(409)
          .json({ message: "Permission name already taken" });
      }
    }

    permission.name = name || permission.name;
    permission.description =
      description !== undefined ? description : permission.description;

    await permission.save();
    return res.status(200).json({ message: "Permission updated successfully" });
  } catch (error) {
    console.error("Error updating permission:", error);
    return res.status(500).json({ message: "Failed to update permission" });
  }
};

const deletePermission = async (req, res) => {
  try {
    const { id } = req.params;

    const permission = await Permission.findByPk(id);
    if (!permission) {
      return res.status(404).json({ message: "Permission not found" });
    }

    await permission.destroy();
    return res.status(200).json({ message: "Permission deleted successfully" });
  } catch (error) {
    console.error("Error deleting permission:", error);
    return res.status(500).json({ message: "Failed to delete permission" });
  }
};

module.exports = {
  listPermissions,
  createPermission,
  updatePermission,
  deletePermission,
};
