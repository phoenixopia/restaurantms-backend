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

      await role.update(
        {
          ...(updates.name && { name: updates.name.toLowerCase() }),
          ...(updates.description && { description: updates.description }),
        },
        { transaction: t }
      );

      if (updates.permissions) {
        const newPermissionIds = Array.isArray(updates.permissions)
          ? updates.permissions.map((p) => (typeof p === "string" ? p : p.id))
          : [];

        const currentPermissions = await RolePermission.findAll({
          where: { role_id: id, granted: true },
          transaction: t,
        });

        const currentIds = new Set(
          currentPermissions.map((p) => p.permission_id)
        );
        const newIdsSet = new Set(newPermissionIds);

        const toAdd = newPermissionIds
          .filter((id) => !currentIds.has(id))
          .map((id) => ({
            role_id: id,
            permission_id: id,
            granted: true,
          }));

        const toRemove = Array.from(currentIds).filter(
          (id) => !newIdsSet.has(id)
        );

        if (toAdd.length > 0) {
          await RolePermission.bulkCreate(toAdd, { transaction: t });
        }

        if (toRemove.length > 0) {
          await RolePermission.destroy({
            where: {
              role_id: id,
              permission_id: { [Op.in]: toRemove },
              granted: true,
            },
            transaction: t,
          });
        }
      }

      await t.commit();

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
          attributes: ["id", "name"],
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

  async getMyOwnRolePermission(userId) {
    console.log(userId);
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Role,
          attributes: ["id", "name"],
          include: [
            {
              model: Permission,
              attributes: ["id", "name"],
              through: {
                where: { granted: true },
                attributes: [],
              },
            },
          ],
        },
      ],
    });

    if (!user || !user.Role) throwError("User or role not found", 404);

    const role = user.Role;
    const rolePermissions = role.Permissions.map((p) => ({
      id: p.id,
      name: p.name,
      source: "role",
    }));

    let directPermissions = [];

    if (role.name.toLowerCase() === "staff") {
      const userPermissions = await UserPermission.findAll({
        where: {
          user_id: userId,
          granted: true,
        },
        include: [
          {
            model: Permission,
            attributes: ["id", "name"],
          },
        ],
      });

      directPermissions = userPermissions.map((up) => ({
        id: up.Permission.id,
        name: up.Permission.name,
        source: "direct",
      }));
    }

    const merged = new Map();
    [...rolePermissions, ...directPermissions].forEach((p) => {
      if (!merged.has(p.id)) {
        merged.set(p.id, p);
      }
    });

    return {
      role: {
        id: role.id,
        name: role.name,
      },
      permissions: Array.from(merged.values()),
    };
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

  // async togglePermissionForRole(roleId, permissionIds) {
  //   if (!roleId) throwError("roleId is required", 400);
  //   if (
  //     !permissionIds ||
  //     (Array.isArray(permissionIds) && permissionIds.length === 0)
  //   ) {
  //     throwError("At least one permissionId is required", 400);
  //   }

  //   const t = await sequelize.transaction();
  //   try {
  //     const ids = Array.isArray(permissionIds)
  //       ? permissionIds
  //       : [permissionIds];
  //     const batchSize = 100;
  //     const results = {
  //       added: 0,
  //       removed: 0,
  //     };

  //     for (let i = 0; i < ids.length; i += batchSize) {
  //       const batch = ids.slice(i, i + batchSize);

  //       const existing = await RolePermission.findAll({
  //         where: {
  //           role_id: roleId,
  //           permission_id: { [Op.in]: batch },
  //           granted: true,
  //         },
  //         transaction: t,
  //       });

  //       const existingIds = new Set(existing.map((p) => p.permission_id));

  //       const toInsert = batch
  //         .filter((id) => !existingIds.has(id))
  //         .map((id) => ({
  //           role_id: roleId,
  //           permission_id: id,
  //           granted: true,
  //         }));

  //       const toDelete = batch.filter((id) => existingIds.has(id));

  //       if (toInsert.length > 0) {
  //         await RolePermission.bulkCreate(toInsert, { transaction: t });
  //         results.added += toInsert.length;
  //       }

  //       if (toDelete.length > 0) {
  //         const deleted = await RolePermission.destroy({
  //           where: {
  //             role_id: roleId,
  //             permission_id: { [Op.in]: toDelete },
  //           },
  //           transaction: t,
  //         });
  //         results.removed += deleted;
  //       }
  //     }

  //     await t.commit();
  //     return results;
  //   } catch (err) {
  //     await t.rollback();
  //     throw err;
  //   }
  // },

  async addPermissionsToRole(roleId, permissionIds) {
    if (!roleId) throwError("roleId is required", 400);
    if (!permissionIds || permissionIds.length === 0) {
      throwError("At least one permissionId is required", 400);
    }

    const t = await sequelize.transaction();
    try {
      const ids = Array.isArray(permissionIds)
        ? permissionIds
        : [permissionIds];

      const existing = await RolePermission.findAll({
        where: {
          role_id: roleId,
          permission_id: { [Op.in]: ids },
          granted: true,
        },
        transaction: t,
      });

      const existingIds = new Set(existing.map((p) => p.permission_id));

      const toInsert = ids
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
      return { added: toInsert.length };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async removePermissionsFromRole(roleId, permissionIds) {
    if (!roleId) throwError("roleId is required", 400);
    if (!permissionIds || permissionIds.length === 0) {
      throwError("At least one permissionId is required", 400);
    }

    const t = await sequelize.transaction();
    try {
      const ids = Array.isArray(permissionIds)
        ? permissionIds
        : [permissionIds];

      const deleted = await RolePermission.destroy({
        where: {
          role_id: roleId,
          permission_id: { [Op.in]: ids },
          granted: true,
        },
        transaction: t,
      });

      await t.commit();
      return { removed: deleted };
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

      if (!currentUser.restaurant_id) {
        throwError("Current user is not assigned to any restaurant", 400);
      }

      const restaurantId = currentUser.restaurant_id;

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
            restaurant_id: restaurantId,
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
