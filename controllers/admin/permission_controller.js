const { Permission, Role, RolePermission, sequelize } = require("../../models");
const { Op } = require("sequelize");

exports.listPermissions = async (req, res) => {
  try {
    const permissions = await Permission.findAll();
    return res.status(200).json(permissions);
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return res.status(500).json({ message: "Failed to retrieve permissions" });
  }
};

exports.createPermission = async (req, res) => {
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

    await Permission.create({ name, description });
    return res.status(201).json({ message: "Permission created successfully" });
  } catch (error) {
    console.error("Error creating permission:", error);
    return res.status(500).json({ message: "Failed to create permission" });
  }
};

exports.updatePermission = async (req, res) => {
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

exports.deletePermission = async (req, res) => {
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

exports.grantPermissionsToRole = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { roleName, permissionIds } = req.body;

    if (
      !roleName ||
      !Array.isArray(permissionIds) ||
      permissionIds.length === 0
    ) {
      return res
        .status(400)
        .json({ message: "roleName and permissionIds[] are required" });
    }

    const role = await Role.findOne({ where: { name: roleName } });
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    const role_id = role.id;

    for (const permission_id of permissionIds) {
      const [entry, created] = await RolePermission.findOrCreate({
        where: { role_id, permission_id },
        defaults: { granted: true },
        transaction: t,
      });

      if (!created && !entry.granted) {
        entry.granted = true;
        await entry.save({ transaction: t });
      }
    }

    await t.commit();
    return res
      .status(200)
      .json({ message: "Permissions granted successfully" });
  } catch (error) {
    await t.rollback();
    console.error("Error granting permissions:", error);
    return res.status(500).json({ message: "Failed to grant permissions" });
  }
};

exports.revokePermissionsFromRole = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { roleName, permissionIds } = req.body;

    if (
      !roleName ||
      !Array.isArray(permissionIds) ||
      permissionIds.length === 0
    ) {
      return res
        .status(400)
        .json({ message: "roleName and permissionIds[] are required" });
    }

    const role = await Role.findOne({ where: { name: roleName } });
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    const role_id = role.id;

    for (const permission_id of permissionIds) {
      const entry = await RolePermission.findOne({
        where: { role_id, permission_id },
        transaction: t,
      });

      if (entry && entry.granted) {
        entry.granted = false;
        await entry.save({ transaction: t });
      }
    }

    await t.commit();
    return res
      .status(200)
      .json({ message: "Permissions revoked successfully" });
  } catch (error) {
    await t.rollback();
    console.error("Error revoking permissions:", error);
    return res.status(500).json({ message: "Failed to revoke permissions" });
  }
};
