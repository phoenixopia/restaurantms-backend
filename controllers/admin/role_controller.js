const { User, Role, sequelize } = require("../../models");
const { Op } = require("sequelize");

// for feature use
exports.createRole = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { name, description } = req.body;

    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Role name is required" });
    }

    const existing = await Role.findOne({ where: { name }, transaction: t });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: "Role already exists" });
    }

    await Role.create({ name, description }, { transaction: t });

    await t.commit();
    return res
      .status(201)
      .json({ success: true, message: "Role created successfully" });
  } catch (error) {
    await t.rollback();
    console.error("Error creating role:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create role" });
  }
};

exports.listRoles = async (req, res) => {
  try {
    const roles = await Role.findAll();
    return res.status(200).json({ success: true, roles });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to retrieve roles" });
  }
};

exports.getRole = async (req, res) => {
  try {
    const { id } = req.params;
    let { page = 1, limit = 10 } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const role = await Role.findByPk(id, {
      include: [
        {
          model: sequelize.models.Permission,
          through: {
            attributes: ["granted"],
          },
          limit,
          offset,
        },
      ],
    });

    if (!role) {
      return res
        .status(404)
        .json({ success: false, message: "Role not found" });
    }

    const totalPermissions = await role.countPermissions();

    return res.status(200).json({
      success: true,
      role,
      pagination: {
        page,
        limit,
        totalPermissions,
        totalPages: Math.ceil(totalPermissions / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching role:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to retrieve role" });
  }
};

exports.updateRole = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const role = await Role.findByPk(id, { transaction: t });
    if (!role) {
      return res
        .status(404)
        .json({ success: false, message: "Role not found" });
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
        return res
          .status(409)
          .json({ success: false, message: "Role name already taken" });
      }
    }

    role.name = name || role.name;
    role.description =
      description !== undefined ? description : role.description;

    await role.save({ transaction: t });
    await t.commit();

    return res
      .status(200)
      .json({ success: true, message: "Role updated successfully" });
  } catch (error) {
    await t.rollback();
    console.error("Error updating role:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update role" });
  }
};

exports.deleteRole = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const role = await Role.findByPk(id, { transaction: t });
    if (!role) {
      return res
        .status(404)
        .json({ success: false, message: "Role not found" });
    }

    await sequelize.models.RolePermission.destroy({
      where: { role_id: id },
      transaction: t,
    });

    await role.destroy({ transaction: t });
    await t.commit();

    return res
      .status(200)
      .json({ success: true, message: "Role deleted successfully" });
  } catch (error) {
    await t.rollback();
    console.error("Error deleting role:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete role" });
  }
};

// both for grant and revoke
exports.assignPermissionsToRole = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { roleName, permissions } = req.body;

    if (!roleName || !Array.isArray(permissions) || permissions.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid request data." });
    }

    const role = await Role.findOne({
      where: { name: roleName },
      transaction: t,
    });
    if (!role) {
      return res
        .status(404)
        .json({ success: false, message: "Role not found." });
    }

    const roleId = role.id;

    for (const perm of permissions) {
      const { permissionId, granted } = perm;

      const permission = await sequelize.models.Permission.findByPk(
        permissionId,
        { transaction: t }
      );
      if (!permission) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: `Permission with ID ${permissionId} not found.`,
        });
      }

      const rolePermission = await sequelize.models.RolePermission.findOne({
        where: { role_id: roleId, permission_id: permissionId },
        transaction: t,
      });

      if (rolePermission) {
        rolePermission.granted = granted === undefined ? true : granted;
        await rolePermission.save({ transaction: t });
      } else {
        await sequelize.models.RolePermission.create(
          {
            role_id: roleId,
            permission_id: permissionId,
            granted: granted === undefined ? true : granted,
          },
          { transaction: t }
        );
      }
    }

    await t.commit();
    return res.status(200).json({
      success: true,
      message: "Permissions updated successfully for the role.",
    });
  } catch (error) {
    await t.rollback();
    console.error("Error updating permissions:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update permissions." });
  }
};

// remove a specific permission from a role
exports.removePermissionFromRole = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { roleName, permissionId } = req.body;

    if (!roleName || !permissionId) {
      return res.status(400).json({
        success: false,
        message: "roleName and permissionId are required",
      });
    }

    const role = await sequelize.models.Role.findOne({
      where: { name: roleName },
      transaction: t,
    });
    if (!role) {
      return res
        .status(404)
        .json({ success: false, message: "Role not found" });
    }

    const rolePermission = await sequelize.models.RolePermission.findOne({
      where: { role_id: role.id, permission_id: permissionId },
      transaction: t,
    });

    if (!rolePermission) {
      return res
        .status(404)
        .json({ success: false, message: "Permission not assigned to role" });
    }

    await rolePermission.destroy({ transaction: t });
    await t.commit();

    return res
      .status(200)
      .json({ success: true, message: "Permission removed from role" });
  } catch (error) {
    await t.rollback();
    console.error("Error removing permission:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to remove permission" });
  }
};

// assign role to users
exports.assignRoleToUser = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { userId, roleName } = req.body;
    if (!userId || !roleName) {
      return res.status(400).json({
        success: false,
        message: "userId and role are required",
      });
    }

    const user = await UserActivation.findByPk(userId, { transaction: t });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const role = await Role.findOne({
      where: { name: roleName },
      transaction: t,
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }
    await user.setRole(role, { transaction: t });
    await t.commit();
    return res.status(200).json({
      success: true,
      message: `Role assigned to user successfully`,
    });
  } catch (error) {
    await t.rollback();
    console.error("Error assigning role to user:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to assign role." });
  }
};

// remove a role from a user
exports.removeRoleFromUser = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { userId } = req.body;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "userId is required." });
    }

    const user = await User.findByPk(userId, { transaction: t });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    await user.setRole(null, { transaction: t });

    await t.commit();
    return res
      .status(200)
      .json({ success: true, message: "Role removed from user successfully." });
  } catch (error) {
    await t.rollback();
    console.error("Error removing role from user:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to remove role." });
  }
};
