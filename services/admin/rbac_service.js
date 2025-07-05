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
        where: {
          name: data.name.toLowerCase(),
        },
        transaction: t,
      });
      if (exists) {
        throwError("Role with this name already exists", 400);
      }

      const role = await Role.create(data, { transaction: t });
      await t.commit();
      return role;
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

      await role.update(updates, { transaction: t });
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async getAllRoles() {
    return await Role.findAll();
  },

  async getRoleById(id) {
    const role = await Role.findByPk(id);
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

      const permission = await Permission.create(data, { transaction: t });
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
    const permission = await Permission.findByPk(id);
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
