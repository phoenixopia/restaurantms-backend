const { Role, sequelize } = require("../../models");
const { Op } = require("sequelize");

exports.createRole = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Role name is required" });
    }

    const existing = await Role.findOne({ where: { name }, transaction: t });
    if (existing) {
      return res.status(409).json({ message: "Role already exists" });
    }

    await Role.create({ name, description }, { transaction: t });

    await t.commit();
    return res.status(201).json({ message: "Role created successfully" });
  } catch (error) {
    await t.rollback();
    console.error("Error creating role:", error);
    return res.status(500).json({ message: "Failed to create role" });
  }
};

exports.listRoles = async (req, res) => {
  try {
    const roles = await Role.findAll();
    return res.status(200).json(roles);
  } catch (error) {
    console.error("Error fetching roles:", error);
    return res.status(500).json({ message: "Failed to retrieve roles" });
  }
};

exports.updateRole = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const role = await Role.findByPk(id, { transaction: t });
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    if (name && name !== role.name) {
      const duplicate = await Role.findOne({
        where: {
          name,
          id: { [Op.ne]: id },
        },
        transaction: t,
      });
      if (duplicate) {
        return res.status(409).json({ message: "Role name already taken" });
      }
    }

    role.name = name || role.name;
    role.description =
      description !== undefined ? description : role.description;

    await role.save({ transaction: t });
    await t.commit();

    return res.status(200).json({ message: "Role updated successfully" });
  } catch (error) {
    await t.rollback();
    console.error("Error updating role:", error);
    return res.status(500).json({ message: "Failed to update role" });
  }
};

exports.deleteRole = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const role = await Role.findByPk(id, { transaction: t });
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    await role.destroy({ transaction: t });
    await t.commit();

    return res.status(200).json({ message: "Role deleted successfully" });
  } catch (error) {
    await t.rollback();
    console.error("Error deleting role:", error);
    return res.status(500).json({ message: "Failed to delete role" });
  }
};
