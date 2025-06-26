const {
  Role,
  User,
  Permission,
  RolePermission,
  UserPermission,
  sequelize,
} = require("../models");
const { Op, where } = require("sequelize");
const throwError = require("../utils/throwError");
const { buildPagination } = require("../utils/pagination");

const RbacService = {
  // ================== ROLE ==================

  async createRole(data) {
    const t = await sequelize.transaction();
    try {
      const exists = await Role.findOne({
        where: sequelize.where(
          sequelize.fn("lower", sequelize.col("name")),
          data.name.toLowerCase()
        ),
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

  async getCreatedUsers(adminId) {
    return await User.findAll({
      where: { created_by: adminId },
    });
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

  async grantPermissionToRole(roleId, permissionIds) {
    const t = await sequelize.transaction();
    try {
      const existing = await RolePermission.findAll({
        where: {
          role_id: roleId,
          permission_id: { [Op.in]: permissionIds },
          granted: true,
        },
        transaction: t,
      });

      const existingIds = new Set(existing.map((p) => p.permission_id));
      const toInsert = permissionIds
        .filter((id) => !existingIds.has(id))
        .map((id) => ({
          role_id: roleId,
          permission_id: id,
          granted: true,
        }));

      if (toInsert.length > 0) {
        await RolePermission.bulkCreate(toInsert, { transaction: t });
      }

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async revokePermissionFromRole(roleId, permissionIds) {
    const t = await sequelize.transaction();
    try {
      await RolePermission.destroy({
        where: {
          role_id: roleId,
          permission_id: { [Op.in]: permissionIds },
        },
        transaction: t,
      });
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async getRolePermissions(roleId) {
    const role = await Role.findByPk(roleId, {
      include: {
        model: Permission,
        through: {
          where: { granted: true },
          attributes: ["granted"],
        },
      },
    });
    if (!role) throwError("Role not found", 404);
    return role.Permissions;
  },

  // USER-PERMISSION

  async grantPermissionToUser(userId, permissionIds, currentUser) {
    const t = await sequelize.transaction();
    try {
      const targetUser = await User.findByPk(userId, { transaction: t });
      if (!targetUser) throwError("User not found", 404);
      if (targetUser.created_by !== currentUser.id) {
        throwError("You can only grant permissions to users you created", 403);
      }

      const currentPerms = await this.getUserEffectivePermissions(
        currentUser.id
      );
      const currentPermIds = new Set(currentPerms.map((p) => p.id));
      const invalid = permissionIds.filter((id) => !currentPermIds.has(id));
      if (invalid.length) {
        throwError("You cannot grant permissions you don't own", 403);
      }

      const existing = await UserPermission.findAll({
        where: {
          user_id: userId,
          permission_id: { [Op.in]: permissionIds },
          granted: true,
        },
        transaction: t,
      });

      const existingIds = new Set(existing.map((p) => p.permission_id));
      const toInsert = permissionIds
        .filter((id) => !existingIds.has(id))
        .map((id) => ({
          user_id: userId,
          permission_id: id,
          granted: true,
          granted_by: currentUser.id,
        }));

      if (toInsert.length > 0) {
        await UserPermission.bulkCreate(toInsert, { transaction: t });
      }

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async revokePermissionFromUser(userId, permissionIds, currentUser) {
    const t = await sequelize.transaction();
    try {
      const targetUser = await User.findByPk(userId, { transaction: t });
      if (!targetUser) throwError("User not found", 404);
      if (targetUser.created_by !== currentUser.id) {
        throwError(
          "You can only revoke permissions from users you created",
          403
        );
      }

      await UserPermission.destroy({
        where: {
          user_id: userId,
          permission_id: { [Op.in]: permissionIds },
        },
        transaction: t,
      });
      await t.commit();
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
          attributes: ["granted"],
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
