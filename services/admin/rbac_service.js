const {
  Role,
  User,
  Permission,
  RolePermission,
  UserPermission,
  sequelize,
} = require("../../models");
const { Op, where } = require("sequelize");
const throwError = require("../../utils/throwError");
const { buildPagination } = require("../../utils/pagination");

const RbacService = {
  // ================== ROLE ==================

  async createRole(data) {
    const t = await sequelize.transaction();
    try {
      const exists = await Role.findOne({
        where: { name: data.name.toLowerCase() },
        transaction: t,
      });

      if (exists) {
        throwError("Role with this name already exists", 400);
      }

      const { name, description, permissions } = data;

      const role = await Role.create(
        {
          name: name.toLowerCase(),
          description,
        },
        { transaction: t }
      );

      if (permissions && permissions.length > 0) {
        const permissionIds = Array.isArray(permissions)
          ? permissions
          : [permissions];

        const rolePermissions = permissionIds.map((permissionId) => ({
          role_id: role.id,
          permission_id: permissionId,
          granted: true,
        }));

        await RolePermission.bulkCreate(rolePermissions, { transaction: t });
      }

      await t.commit();

      const roleWithPermissions = await Role.findByPk(role.id, {
        include: [
          {
            model: Permission,
            through: { attributes: ["granted"] },
            attributes: ["id", "name", "description"],
          },
        ],
      });

      return roleWithPermissions;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async updateRole(id, updates) {
    const t = await sequelize.transaction();
    try {
      const role = await Role.findByPk(id, { transaction: t });
      if (!role) throwError("Role not found", 404);

      // Check for name uniqueness
      if (updates.name) {
        const exists = await Role.findOne({
          where: {
            id: { [Op.ne]: id },
            [Op.and]: sequelize.where(
              sequelize.fn("lower", sequelize.col("name")),
              updates.name.toLowerCase()
            ),
          },
          transaction: t,
        });
        if (exists) {
          throwError("Another role with this name already exists", 400);
        }
      }

      // Update role name or description
      await role.update(
        {
          ...(updates.name && { name: updates.name.toLowerCase() }),
          ...(updates.description && { description: updates.description }),
        },
        { transaction: t }
      );

      // Handle permissions if provided
      if (updates.permissions) {
        const permissionUpdates = Array.isArray(updates.permissions)
          ? updates.permissions.map((p) =>
              typeof p === "string" ? { id: p, granted: true } : p
            )
          : [];

        // Load current RolePermissions
        const currentPermissions = await RolePermission.findAll({
          where: { role_id: id },
          transaction: t,
        });

        const currentMap = new Map(
          currentPermissions.map((p) => [p.permission_id, p])
        );

        for (const p of permissionUpdates) {
          const existing = currentMap.get(p.id);

          if (p.granted) {
            // Grant if not already granted
            if (!existing) {
              await RolePermission.create(
                {
                  role_id: id,
                  permission_id: p.id,
                  granted: true,
                },
                { transaction: t }
              );
            }
          } else {
            // Revoke if already granted
            if (existing) {
              await existing.destroy({ transaction: t });
            }
          }
        }
      }

      await t.commit();

      // Return updated role with permissions
      const updatedRole = await Role.findByPk(id, {
        include: [
          {
            model: Permission,
            through: { attributes: ["granted"] },
            attributes: ["id", "name", "description"],
          },
        ],
      });

      return updatedRole;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async getAllRoles() {
    return await Role.findAll({
      include: [
        {
          model: Permission,
          attributes: ["id", "name", "description"],
          through: {
            where: { granted: true },
            attributes: [],
          },
        },
      ],
      order: [["name", "ASC"]],
    });
  },

  async getRoleById(id) {
    const role = await Role.findByPk(id, {
      include: [
        {
          model: Permission,
          attributes: ["id", "name", "description"],
          through: {
            where: { granted: true },
            attributes: [],
          },
        },
      ],
    });

    if (!role) throwError("Role not found", 404);

    return role;
  },

  async getMyOwnRolePermission(id) {
    const role = await Role.findByPk(id, {
      include: [
        {
          model: Permission,
          attributes: ["id", "name", "description"],
          through: {
            where: { granted: true },
            attributes: [],
          },
        },
      ],
    });

    if (!role) throwError("Role not found", 404);

    return role;
  },

  // ================== PERMISSION ==================

  async createPermission(data) {
    const t = await sequelize.transaction();
    try {
      const exists = await Permission.findOne({
        where: sequelize.where(
          sequelize.fn("lower", sequelize.col("name")),
          data.name.toLowerCase()
        ),
        transaction: t,
      });

      if (exists) {
        throwError("Permission with this name already exists", 400);
      }

      const { role_ids, ...permissionData } = data;

      const permission = await Permission.create(permissionData, {
        transaction: t,
      });

      // Optionally assign to roles if role_ids is provided
      if (Array.isArray(role_ids) && role_ids.length > 0) {
        const rolePermissionData = role_ids.map((role_id) => ({
          role_id,
          permission_id: permission.id,
          granted: true,
        }));

        await RolePermission.bulkCreate(rolePermissionData, {
          transaction: t,
          ignoreDuplicates: true,
        });
      }

      await t.commit();
      return permission;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async updatePermission(id, updates) {
    const t = await sequelize.transaction();
    try {
      const permission = await Permission.findByPk(id, { transaction: t });
      if (!permission) throwError("Permission not found", 404);

      if (updates.name) {
        const exists = await Permission.findOne({
          where: {
            id: { [Op.ne]: id },
            [Op.and]: sequelize.where(
              sequelize.fn("lower", sequelize.col("name")),
              updates.name.toLowerCase()
            ),
          },
          transaction: t,
        });
        if (exists) {
          throwError("Another permission with this name already exists", 400);
        }
      }

      await permission.update(updates, { transaction: t });
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async getAllPermissions(query = {}) {
    const { page, limit, offset, order, where } = buildPagination(query);
    const { count, rows } = await Permission.findAndCountAll({
      where,
      order,
      limit,
      offset,
    });
    return {
      total: count,
      page,
      limit,
      permissions: rows,
    };
  },

  async getPermissionById(id) {
    const permission = await Permission.findByPk(id, {
      include: [
        {
          model: Role,
          through: {
            attributes: ["granted"],
          },
          attributes: ["id", "name", "description"],
        },
      ],
    });

    if (!permission) throwError("Permission not found", 404);
    return permission;
  },
  // ================== ROLE-PERMISSION ==================

  async togglePermissionForRole(roleId, permissionIds) {
    if (!roleId) throwError("roleId is required", 400);
    if (
      !permissionIds ||
      (Array.isArray(permissionIds) && permissionIds.length === 0)
    ) {
      throwError("At least one permissionId is required", 400);
    }

    const t = await sequelize.transaction();
    try {
      const ids = Array.isArray(permissionIds)
        ? permissionIds
        : [permissionIds];
      const batchSize = 100;
      const results = {
        added: 0,
        removed: 0,
      };

      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);

        const existing = await RolePermission.findAll({
          where: {
            role_id: roleId,
            permission_id: { [Op.in]: batch },
            granted: true,
          },
          transaction: t,
        });

        const existingIds = new Set(existing.map((p) => p.permission_id));

        const toInsert = batch
          .filter((id) => !existingIds.has(id))
          .map((id) => ({
            role_id: roleId,
            permission_id: id,
            granted: true,
          }));

        const toDelete = batch.filter((id) => existingIds.has(id));

        if (toInsert.length > 0) {
          await RolePermission.bulkCreate(toInsert, { transaction: t });
          results.added += toInsert.length;
        }

        if (toDelete.length > 0) {
          const deleted = await RolePermission.destroy({
            where: {
              role_id: roleId,
              permission_id: { [Op.in]: toDelete },
            },
            transaction: t,
          });
          results.removed += deleted;
        }
      }

      await t.commit();
      return results;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async getRoleWithPermissions(roleId, query = {}) {
    const role = await Role.findByPk(roleId);

    if (!role) throwError("Role not found", 404);

    const { page, limit, offset, order } = buildPagination(query);
    const { count, rows: permissions } = await Permission.findAndCountAll({
      include: [
        {
          model: Role,
          where: { id: roleId },
          through: {
            where: { granted: true },
          },
          attributes: [],
        },
      ],
      offset,
      limit,
      order,
    });

    return {
      role,
      permissions: {
        total: count,
        page,
        limit,
        items: permissions,
      },
    };
  },

  // USER-PERMISSION

  async togglePermissionForUser(userId, permissionIds, currentUser) {
    if (!userId) throwError("userId is required", 400);
    if (
      !permissionIds ||
      (Array.isArray(permissionIds) && permissionIds.length === 0)
    ) {
      throwError("At least one permissionId is required", 400);
    }

    const ids = Array.isArray(permissionIds) ? permissionIds : [permissionIds];

    const t = await sequelize.transaction();
    try {
      const targetUser = await User.findByPk(userId, { transaction: t });
      if (!targetUser) throwError("User not found", 404);

      if (targetUser.created_by !== currentUser.id) {
        throwError(
          "You can only manage permissions for users you created",
          403
        );
      }

      const currentPerms = await this.getUserEffectivePermissions(
        currentUser.id
      );
      const currentPermIds = new Set(currentPerms.map((p) => p.id));

      const invalid = ids.filter((id) => !currentPermIds.has(id));
      if (invalid.length > 0) {
        throwError("You cannot toggle permissions you do not own", 403);
      }

      const batchSize = 100;
      const results = { added: 0, removed: 0 };

      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);

        const existing = await UserPermission.findAll({
          where: {
            user_id: userId,
            permission_id: { [Op.in]: batch },
            granted: true,
          },
          transaction: t,
        });

        const existingIds = new Set(existing.map((p) => p.permission_id));

        const toInsert = batch
          .filter((id) => !existingIds.has(id))
          .map((id) => ({
            user_id: userId,
            permission_id: id,
            granted: true,
            granted_by: currentUser.id,
          }));

        const toDelete = batch.filter((id) => existingIds.has(id));

        if (toInsert.length > 0) {
          await UserPermission.bulkCreate(toInsert, { transaction: t });
          results.added += toInsert.length;
        }

        if (toDelete.length > 0) {
          const deletedCount = await UserPermission.destroy({
            where: {
              user_id: userId,
              permission_id: { [Op.in]: toDelete },
            },
            transaction: t,
          });
          results.removed += deletedCount;
        }
      }

      await t.commit();
      return results;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async getUserPermissions(userId) {
    const user = await User.findByPk(userId, {
      include: {
        model: Permission,
        through: {
          where: { granted: true },
        },
      },
    });
    if (!user) throwError("User not found", 404);
    return user.Permissions;
  },

  // EFFECTIVE PERMISSION UTIL

  async getUserEffectivePermissions(userId) {
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Role,
          include: {
            model: Permission,
            through: { where: { granted: true } },
          },
        },
        {
          model: Permission,
          through: { where: { granted: true } },
        },
      ],
    });

    if (!user) return [];

    const rolePermissions = user.Role?.Permissions || [];
    const userPermissions = user.Permissions || [];

    const all = [...rolePermissions, ...userPermissions];
    const unique = new Map();
    all.forEach((p) => unique.set(p.id, p));

    return Array.from(unique.values());
  },
};

module.exports = RbacService;
