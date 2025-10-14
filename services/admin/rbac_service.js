const {
  User,
  Restaurant,
  Branch,
  Role,
  RoleTag,
  Permission,
  RolePermission,
  sequelize,
} = require("../../models");
const { Op, where } = require("sequelize");
const throwError = require("../../utils/throwError");
const { buildPagination } = require("../../utils/pagination");
const logActivity = require("../../utils/logActivity");

const ALLOWED_ROLE_TAGS = [
  "super_admin",
  "restaurant_admin",
  "staff",
  "customer",
  "other",
];

const RbacService = {
  // ================== RoleTag================
  async createRoleTag(data, user) {
    const t = await sequelize.transaction();
    try {
      const { name, description } = data;

      if (!name || !ALLOWED_ROLE_TAGS.includes(name.toLowerCase())) {
        throwError(
          `Invalid role tag name. Allowed values: ${ALLOWED_ROLE_TAGS.join(
            ", "
          )}`,
          400
        );
      }

      const existing = await RoleTag.findOne({
        where: { name: name.toLowerCase() },
        transaction: t,
      });

      if (existing) {
        throwError("Role tag with this name already exists", 400);
      }

      const roleTag = await RoleTag.create(
        {
          name: name.toLowerCase(),
          description: description || null,
        },
        { transaction: t }
      );

      await logActivity({
        user_id: user.id,
        module: "RoleTag",
        action: "Create",
        details: roleTag.toJSON(),
        transaction: t,
      });

      await t.commit();
      return roleTag;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async updateRoleTag(id, updates, user) {
    const t = await sequelize.transaction();
    try {
      const roleTag = await RoleTag.findByPk(id, { transaction: t });
      if (!roleTag) throwError("Role tag not found", 404);

      const oldData = roleTag.toJSON();

      if (updates.name) {
        const exists = await RoleTag.findOne({
          where: { id: { [Op.ne]: id }, name: updates.name.toLowerCase() },
          transaction: t,
        });
        if (exists)
          throwError("Another role tag with this name already exists", 400);
      }

      await roleTag.update(
        {
          ...(updates.name && { name: updates.name.toLowerCase() }),
          ...(updates.description && { description: updates.description }),
        },
        { transaction: t }
      );

      await logActivity({
        user_id: user.id,
        module: "RoleTag",
        action: "Update",
        details: { before: oldData, after: roleTag.toJSON() },
        transaction: t,
      });

      await t.commit();
      return { message: "Role tag updated successfully", data: roleTag };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async getRoleTagByIdWithRoles(id) {
    const roleTag = await RoleTag.findByPk(id, {
      include: [
        {
          model: Role,
          attributes: ["id", "name", "description"],
          include: [
            {
              model: Permission,
              attributes: ["id", "name", "description"],
              through: {
                attributes: [],
              },
            },
          ],
        },
      ],
    });

    if (!roleTag) {
      throwError("Role tag not found", 404);
    }

    return roleTag;
  },

  async getAllRoleTags() {
    return await RoleTag.findAll({
      attributes: ["id", "name", "description"],
      order: [["createdAt", "DESC"]],
    });
  },

  async deleteRoleTag(id, user) {
    const t = await sequelize.transaction();
    try {
      const roleTag = await RoleTag.findByPk(id, { transaction: t });
      if (!roleTag) throwError("Role tag not found", 404);

      const oldData = roleTag.toJSON();

      await RoleTag.destroy({ where: { id }, transaction: t });

      await logActivity({
        user_id: user.id,
        module: "RoleTag",
        action: "Delete",
        details: oldData,
        transaction: t,
      });

      await t.commit();
      return { message: "Role tag deleted successfully", data: null };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  // ================== ROLE ==================

  async getUserPermissionIds(userId) {
    const user = await User.findByPk(userId, {
      include: {
        model: Role,
        include: {
          model: Permission,
          attributes: ["id"],
          through: { attributes: [] },
        },
      },
    });
    return user?.Role?.Permissions?.map((p) => p.id) || [];
  },

  async createRole(
    user,
    { name, description, permissionIds = [], role_tag_id }
  ) {
    const t = await sequelize.transaction();
    try {
      const isRestaurantAdmin = !!user.restaurant_id;
      const normalizedName = name.toLowerCase();

      if (!isRestaurantAdmin) {
        const exists = await Role.findOne({
          where: sequelize.where(
            sequelize.fn("lower", sequelize.col("name")),
            normalizedName
          ),
          transaction: t,
        });
        if (exists) throwError("Role with this name already exists", 400);
      }

      let finalRoleTagId;

      if (isRestaurantAdmin) {
        const staffTag = await RoleTag.findOne({
          where: { name: "staff" },
          transaction: t,
        });
        if (!staffTag) throwError("Staff role tag not found", 500);
        finalRoleTagId = staffTag.id;
      } else {
        if (!role_tag_id) throwError("role_tag_id is required", 400);
        finalRoleTagId = role_tag_id;
      }

      if (permissionIds.length) {
        const foundPermissions = await Permission.findAll({
          where: { id: { [Op.in]: permissionIds } },
          transaction: t,
        });
        if (foundPermissions.length !== permissionIds.length)
          throwError("One or more permissions do not exist", 400);

        if (isRestaurantAdmin) {
          const adminGranted = await this.getUserPermissionIds(user.id);
          const unauthorized = permissionIds.filter(
            (pid) => !adminGranted.includes(pid)
          );
          if (unauthorized.length)
            throwError("You cannot assign permissions you do not have", 403);
        }
      }

      const role = await Role.create(
        {
          name: normalizedName,
          description,
          role_tag_id: finalRoleTagId,
          restaurant_id: isRestaurantAdmin ? user.restaurant_id : null,
          created_by: user.id,
        },
        { transaction: t }
      );

      if (permissionIds.length) {
        const rolePermissions = permissionIds.map((pid) => ({
          role_id: role.id,
          permission_id: pid,
        }));
        await RolePermission.bulkCreate(rolePermissions, { transaction: t });
      }
      await logActivity({
        user_id: user.id,
        module: "Role",
        action: "Create",
        details: role.toJSON(),
        transaction: t,
      });

      await logActivity({
        user_id: user.id,
        module: "Role",
        action: "Create",
        details: role.toJSON(),
        transaction: t,
      });

      await t.commit();

      return await Role.findByPk(role.id, {
        include: [
          {
            model: Permission,
            attributes: ["id", "name"],
            through: { attributes: [] },
          },
        ],
      });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async updateRole(roleId, user, updates) {
    const t = await sequelize.transaction();
    try {
      const role = await Role.findByPk(roleId, {
        include: [Permission],
        transaction: t,
      });
      if (!role) throwError("Role not found", 404);

      const isRestaurantAdmin = !!user.restaurant_id;
      if (isRestaurantAdmin && role.created_by !== user.id)
        throwError("You can only update roles you created", 403);

      if (!isRestaurantAdmin && updates.name) {
        const exists = await Role.findOne({
          where: {
            id: { [Op.ne]: roleId },
            [Op.and]: sequelize.where(
              sequelize.fn("lower", sequelize.col("name")),
              updates.name.toLowerCase()
            ),
          },
          transaction: t,
        });
        if (exists)
          throwError("Another role with this name already exists", 400);
      }

      const oldData = role.toJSON();

      const updateData = {};
      if (updates.name) updateData.name = updates.name.toLowerCase();
      if (updates.description) updateData.description = updates.description;

      await role.update(updateData, { transaction: t });

      if (Array.isArray(updates.permissionIds)) {
        await RolePermission.destroy({
          where: { role_id: roleId },
          transaction: t,
        });

        if (updates.permissionIds.length) {
          const rolePermissions = updates.permissionIds.map((pid) => ({
            role_id: roleId,
            permission_id: pid,
          }));
          await RolePermission.bulkCreate(rolePermissions, { transaction: t });
        }
      }

      await logActivity({
        user_id: user.id,
        module: "Role",
        action: "Update",
        details: { before: oldData, after: role.toJSON() },
        transaction: t,
      });

      await t.commit();
      return {
        message: "Role updated successfully",
        data: await Role.findByPk(roleId, { include: [Permission] }),
      };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async getAllRoles(user, { page = 1, limit = 10 }) {
    page = Number(page);
    limit = Number(limit);
    const offset = (page - 1) * limit;

    const where = { created_by: user.id };

    const { count, rows } = await Role.findAndCountAll({
      where,
      include: [
        {
          model: RoleTag,
          attributes: ["id", "name"],
        },
        {
          model: Permission,
          attributes: ["id", "name"],
          through: { attributes: [] },
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    let restaurantName = null;
    if (user.restaurant_id) {
      const restaurant = await Restaurant.findByPk(user.restaurant_id, {
        attributes: ["restaurant_name"],
      });
      restaurantName = restaurant?.restaurant_name || null;
    }

    const roles = rows.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      role_tag: role.RoleTag
        ? { id: role.RoleTag.id, name: role.RoleTag.name }
        : null,
      restaurant_name: restaurantName,
      permissions:
        role.Permissions?.map((p) => ({
          id: p.id,
          name: p.name,
        })) || [],
      permission_count: role.Permissions?.length || 0,
    }));

    return {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      roles,
    };
  },

  async deleteRole(roleId, user) {
    const t = await sequelize.transaction();
    try {
      const role = await Role.findByPk(roleId, { transaction: t });
      if (!role) throwError("Role not found", 404);

      const isRestaurantAdmin = !!user.restaurant_id;
      if (isRestaurantAdmin && role.created_by !== user.id)
        throwError("You can only delete roles you created", 403);

      await RolePermission.destroy({
        where: { role_id: roleId },
        transaction: t,
      });
      await Role.destroy({ where: { id: roleId }, transaction: t });

      await logActivity({
        user_id: user.id,
        module: "Role",
        action: "Delete",
        details: role.toJSON(),
        transaction: t,
      });

      await t.commit();
      return { message: "Role deleted successfully", data: null };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async getRoleById(roleId, user) {
    const where = { id: roleId };

    if (user.restaurant_id) {
      where.created_by = user.id;
    }

    const role = await Role.findOne({
      where,
      include: [
        { model: RoleTag, attributes: ["id", "name"] },
        {
          model: Permission,
          attributes: ["id", "name"],
          through: { attributes: [] },
        },
      ],
    });

    if (!role) return null;

    let restaurant = null;
    if (user.restaurant_id) {
      const foundRestaurant = await Restaurant.findByPk(user.restaurant_id, {
        attributes: ["restaurant_name"],
      });
      restaurant = foundRestaurant ? { name: foundRestaurant.name } : null;
    }

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      created_by: role.created_by,
      role_tag: role.RoleTag
        ? { id: role.RoleTag.id, name: role.RoleTag.name }
        : null,
      restaurant,
      permissions: role.Permissions.map((p) => ({ id: p.id, name: p.name })),
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

      if (Array.isArray(role_ids) && role_ids.length > 0) {
        const rolePermissionData = role_ids.map((role_id) => ({
          role_id,
          permission_id: permission.id,
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

  async updatePermission(id, data) {
    const t = await sequelize.transaction();
    try {
      const { role_ids, name, ...otherData } = data;

      if (name) {
        const existing = await Permission.findOne({
          where: {
            name: sequelize.where(
              sequelize.fn("lower", sequelize.col("name")),
              name.toLowerCase()
            ),
            id: { [sequelize.Op.ne]: id },
          },
          transaction: t,
        });

        if (existing) {
          throwError("Permission with this name already exists", 400);
        }
      }

      const permission = await Permission.findByPk(id, { transaction: t });
      if (!permission) {
        throwError("Permission not found", 404);
      }

      await permission.update({ name, ...otherData }, { transaction: t });

      if (Array.isArray(role_ids) && role_ids.length > 0) {
        const currentRolePermissions = await RolePermission.findAll({
          where: { permission_id: id },
          attributes: ["role_id"],
          transaction: t,
        });

        const currentRoleIds = currentRolePermissions.map((rp) => rp.role_id);

        const newRoleIds = role_ids.filter(
          (rid) => !currentRoleIds.includes(rid)
        );

        if (newRoleIds.length > 0) {
          const rolePermissionData = newRoleIds.map((role_id) => ({
            role_id,
            permission_id: id,
          }));

          await RolePermission.bulkCreate(rolePermissionData, {
            transaction: t,
            ignoreDuplicates: true,
          });
        }
      }

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async getAllPermissions(query) {
    let page = parseInt(query.page) || 1;
    let limit = parseInt(query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Permission.findAndCountAll({
      attributes: ["id", "name"],
      offset,
      limit,
      order: [["createdAt", "DESC"]],
    });

    return {
      total: count,
      page,
      limit,
      permissions: rows,
      totalPages: Math.ceil(count / limit),
    };
  },

  async getPermissionById(id) {
    const permission = await Permission.findByPk(id, {
      attributes: ["id", "name", "description"],
      include: [
        {
          model: Role,
          attributes: ["id", "name", "description"],
          through: { attributes: [] },
        },
      ],
    });

    if (!permission) throwError("Permission not found", 404);

    return permission;
  },

  async getMyOwn(userId) {
    const user = await User.findByPk(userId, {
      attributes: ["id"],
      include: [
        {
          model: Role,
          attributes: ["id"],
          include: [
            {
              model: Permission,
              attributes: ["id", "name"],
              through: { attributes: [] },
            },
          ],
        },
      ],
    });

    if (!user) {
      throwError("User not found", 404);
    }

    return {
      permissions: user.Role
        ? user.Role.Permissions.map((p) => ({
            id: p.id,
            name: p.name,
          }))
        : [],
    };
  },

  async getUserRoleWithPermissions(userId) {
    const user = await User.findByPk(userId, {
      attributes: ["id", "role_id"],
      include: [
        {
          model: Role,
          attributes: ["id", "name"],
          include: [
            {
              model: Permission,
              attributes: ["id", "name"],
              through: { attributes: [] },
            },
          ],
        },
      ],
    });

    if (!user) throwError("User not found", 404);

    if (!user.Role) {
      return { role: null, permissions: [] };
    }

    return {
      role: {
        id: user.Role.id,
        name: user.Role.name,
      },
      permissions: user.Role.Permissions.map((perm) => ({
        id: perm.id,
        name: perm.name,
      })),
    };
  },
};

module.exports = RbacService;
