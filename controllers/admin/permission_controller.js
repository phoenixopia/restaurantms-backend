const { Permission, Role, RolePermission, sequelize } = require("../../models");
const { Op } = require("sequelize");

exports.listPermissions = async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;

    const offset = (page - 1) * limit;

    const { count, rows: permissions } = await Permission.findAndCountAll({
      offset,
      limit,
      order: [["id", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      permissions,
      pagination: {
        page,
        limit,
        totalPermissions: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve permissions",
    });
  }
};

exports.getPermissionById = async (req, res) => {
  try {
    const { id } = req.params;
    const permission = await Permission.findByPk(id);
    if (!permission) {
      return res.status(404).json({
        success: false,
        message: "Permission not found",
      });
    }
    return res.status(200).json({
      success: true,
      permission,
    });
  } catch (error) {
    console.error("Error fetching permission:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve permission",
    });
  }
};

exports.listPermissionsForRole = async (req, res) => {
  try {
    const { roleName } = req.params;
    let { page = 1, limit = 10 } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;

    const offset = (page - 1) * limit;

    const role = await Role.findOne({ where: { name: roleName } });
    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    const totalPermissions = await RolePermission.count({
      where: { role_id: role.id },
    });

    const permissions = await RolePermission.findAll({
      where: { role_id: role.id },
      include: [{ model: Permission, as: "permission" }],
      offset,
      limit,
      order: [["permission_id", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      permissions: permissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        description: rp.permission.description,
        granted: rp.granted,
      })),
      pagination: {
        page,
        limit,
        totalPermissions,
        totalPages: Math.ceil(totalPermissions / limit),
      },
    });
  } catch (error) {
    console.error("Error listing permissions for role:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to list permissions for role",
    });
  }
};

exports.createPermission = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { name, description } = req.body;

    if (!name) {
      await t.rollback();
      return res
        .status(400)
        .json({ success: false, message: "Permission name is required" });
    }

    const existing = await Permission.findOne({
      where: { name },
      transaction: t,
    });
    if (existing) {
      await t.rollback();
      return res.status(409).json({
        success: false,
        message: "Permission with this name already exists",
      });
    }

    await Permission.create({ name, description }, { transaction: t });
    await t.commit();
    return res.status(201).json({
      success: true,
      message: "Permission created successfully",
    });
  } catch (error) {
    await t.rollback();
    console.error("Error creating permission:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create permission",
    });
  }
};

exports.updatePermission = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const permission = await Permission.findByPk(id, { transaction: t });
    if (!permission) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Permission not found",
      });
    }

    if (name) {
      const duplicate = await Permission.findOne({
        where: { name, id: { [Op.ne]: id } },
        transaction: t,
      });
      if (duplicate) {
        await t.rollback();
        return res.status(409).json({
          success: false,
          message: "Permission name already taken",
        });
      }
    }

    permission.name = name || permission.name;
    permission.description =
      description !== undefined ? description : permission.description;

    await permission.save({ transaction: t });
    await t.commit();
    return res.status(200).json({
      success: true,
      message: "Permission updated successfully",
    });
  } catch (error) {
    await t.rollback();
    console.error("Error updating permission:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update permission",
    });
  }
};

exports.grantUserPermission = async (req, res) => {
  const { userId, permissions } = req.body;
  const grantorId = req.user.id;

  if (
    !userId ||
    !permissions ||
    (Array.isArray(permissions) && permissions.length === 0)
  ) {
    return res.status(400).json({
      success: false,
      message: "User ID and permission(s) are required",
    });
  }

  try {
    const grantor = await User.findByPk(grantorId);
    if (!grantor) {
      return res.status(404).json({
        success: false,
        message: "Grantor user not found",
      });
    }

    const rolePermissions = await RolePermission.findAll({
      where: { role_id: grantor.role_id, granted: true },
    });
    const allowedPermissionIds = rolePermissions.map((rp) => rp.permission_id);

    const permissionsArray = Array.isArray(permissions)
      ? permissions
      : [permissions];

    for (const perm of permissionsArray) {
      if (!allowedPermissionIds.includes(perm.permissionId)) {
        return res.status(403).json({
          success: false,
          message: "You can only grant permissions you have",
        });
      }
    }

    await req.app.get("sequelize").transaction(async (t) => {
      for (const perm of permissionsArray) {
        await UserPermission.upsert(
          {
            user_id: userId,
            permission_id: perm.permissionId,
            granted: perm.granted,
            granted_by: grantorId,
          },
          { transaction: t }
        );
      }
    });

    return res.status(200).json({
      success: true,
      message: "Permissions granted successfully",
    });
  } catch (error) {
    console.error("Error granting permissions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to grant permissions",
    });
  }
};

exports.revokeUserPermission = async (req, res) => {
  const { userId, permissions } = req.body;
  const revokerId = req.user.id;

  if (
    !userId ||
    !permissions ||
    (Array.isArray(permissions) && permissions.length === 0)
  ) {
    return res.status(400).json({
      success: false,
      message: "User ID and permission(s) are required",
    });
  }

  try {
    const revoker = await User.findByPk(revokerId);
    if (!revoker) {
      return res.status(404).json({
        success: false,
        message: "Revoker user not found",
      });
    }
    const rolePermissions = await RolePermission.findAll({
      where: { role_id: revoker.role_id, granted: true },
    });
    const allowedPermissionIds = rolePermissions.map((rp) => rp.permission_id);

    const permissionsArray = Array.isArray(permissions)
      ? permissions
      : [permissions];

    for (const perm of permissionsArray) {
      if (!allowedPermissionIds.includes(perm.permissionId)) {
        return res.status(403).json({
          success: false,
          message: "You can only revoke permissions you have",
        });
      }
    }

    await req.app.get("sequelize").transaction(async (t) => {
      for (const perm of permissionsArray) {
        await UserPermission.upsert(
          {
            user_id: userId,
            permission_id: perm.permissionId,
            granted: false,
            granted_by: revokerId,
          },
          { transaction: t }
        );
      }
    });

    return res.status(200).json({
      success: true,
      message: "Permissions revoked successfully",
    });
  } catch (error) {
    console.error("Error revoking permissions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to revoke permissions",
    });
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
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "roleName and permissionIds[] are required",
      });
    }

    const role = await Role.findOne({
      where: { name: roleName },
      transaction: t,
    });
    if (!role) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
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
    return res.status(200).json({
      success: true,
      message: "Permissions granted successfully",
    });
  } catch (error) {
    await t.rollback();
    console.error("Error granting permissions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to grant permissions",
    });
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
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "roleName and permissionIds[] are required",
      });
    }

    const role = await Role.findOne({
      where: { name: roleName },
      transaction: t,
    });
    if (!role) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
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
    return res.status(200).json({
      success: true,
      message: "Permissions revoked successfully",
    });
  } catch (error) {
    await t.rollback();
    console.error("Error revoking permissions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to revoke permissions",
    });
  }
};

exports.deletePermission = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const permission = await Permission.findByPk(id, { transaction: t });
    if (!permission) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Permission not found",
      });
    }

    await permission.destroy({ transaction: t });
    await t.commit();
    return res.status(200).json({
      success: true,
      message: "Permission deleted successfully",
    });
  } catch (error) {
    await t.rollback();
    console.error("Error deleting permission:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete permission",
    });
  }
};

exports.bulkDeletePermissions = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Permission ids[] are required",
      });
    }

    await Permission.destroy({
      where: { id: { [Op.in]: ids } },
      transaction: t,
    });

    await t.commit();
    return res.status(200).json({
      success: true,
      message: "Permissions deleted successfully",
    });
  } catch (error) {
    await t.rollback();
    console.error("Error bulk deleting permissions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to bulk delete permissions",
    });
  }
};
