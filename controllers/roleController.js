const { Op } = require('sequelize');
const { sequelize, Role, RolePermission, Permission } = require('../models/index');


// === UPDATE Role (Optional Fields) ===
exports.updateRole = async (req, res) => {
    const { name, description, permissions_id } = req.body;
    const roleId = req.params.id;

    if (!roleId) {
        return res.status(400).json({ success: false, message: 'Missing role ID in request.' });
    }

    const t = await sequelize.transaction();
    try {
        const existingRole = await Role.findByPk(roleId, { transaction: t });
        if (!existingRole) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Role not found.' });
        }

        // Check and update role name if provided
        if (name && name !== existingRole.name) {
            const nameTaken = await Role.findOne({ where: { name }, transaction: t });
            if (nameTaken) {
                await t.rollback();
                return res.status(400).json({ success: false, message: 'Role name already exists. Please use another name.' });
            }
            existingRole.name = name;
        }

        // Update description if provided
        if (description && description !== undefined) {
            existingRole.description = description;
        }

        await existingRole.save({ transaction: t });

        // // Update permissions only if permissions_id is provided and it's an array
        // if (Array.isArray(permissions_id)) {
        //     // Revoke all existing permissions
        //     await RolePermission.update(
        //         { granted: false },
        //         { where: { role_id: roleId }, transaction: t }
        //     );

        //     // Grant the new permissions
        //     for (const permissionId of permissions_id) {
        //         await RolePermission.upsert(
        //             {
        //                 role_id: roleId,
        //                 permission_id: permissionId,
        //                 granted: true
        //             },
        //             { transaction: t }
        //         );
        //     }
        // }

        // Update permissions only if permissions_id is provided and it's an array
        if (Array.isArray(permissions_id)) {
            // ✅ Validate permissions_id before proceeding
            const foundPermissions = await Permission.findAll({
                where: { id: permissions_id },
                transaction: t
            });

            const foundIds = foundPermissions.map(p => p.id);
            const invalidIds = permissions_id.filter(id => !foundIds.includes(id));

            if (invalidIds.length > 0) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Some permission IDs are invalid.',
                    invalid_permissions: invalidIds
                });
            }

            // Revoke all existing permissions
            await RolePermission.update(
                { granted: false },
                { where: { role_id: roleId }, transaction: t }
            );

            // Grant the new permissions
            for (const permissionId of permissions_id) {
                await RolePermission.upsert(
                    {
                        role_id: roleId,
                        permission_id: permissionId,
                        granted: true
                    },
                    { transaction: t }
                );
            }
        }

        await t.commit();

        // Reload the updated role with its granted permissions
        const updatedRole = await Role.findByPk(roleId, {
            include: [
                {
                    model: Permission,
                    through: { where: { granted: true }, attributes: ['granted'] },
                    as: 'permissions'
                }
            ]
        });

        return res.status(200).json({
            success: true,
            message: 'Role updated successfully.',
            data: updatedRole
        });

    } catch (error) {
        await t.rollback();
        console.error('Update Role Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.', error: error.message });
    }
};



// === CREATE A ROLE ===
exports.createRole = async (req, res) => {
    const { name, description, permissions_id } = req.body;
    const t = await sequelize.transaction();

    try {
        if (!name || !Array.isArray(permissions_id) || permissions_id.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields or permissions.'
            });
        }

        // Create the role
        const [newRole, created] = await Role.findOrCreate({
            where: { name },
            defaults: { name, description },
            transaction: t
        });

        if (!created) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: `A role with ${name} already exists.`
            });
        }

        // Create permissions and associate with role
        for (const permName of permissions_id) {
            const [permission] = await Permission.findOrCreate({
                where: { name: permName },
                defaults: { name: permName },
                transaction: t
            });

            await RolePermission.findOrCreate({
                where: {
                    role_id: newRole.id,
                    permission_id: permission.id,
                    granted: true
                },
                defaults: {
                    role_id: newRole.id,
                    permission_id: permission.id,
                    granted: true
                },
                transaction: t
            });
        }

        await t.commit();
        return res.status(201).json({
            success: true,
            message: 'Role created successfully.',
            data: newRole
        });

    } catch (error) {
        await t.rollback();
        console.error('Create Role Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error.',
            error: error.message
        });
    }
};


// === GET ALL Roles ===
exports.getAllRoles = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const pageSize = parseInt(limit, 10) || 10;
    const dataCount = await Role.count({where: {name: { [Op.ne]: 'super_admin' }}});
    const totalPages = Math.ceil(dataCount / pageSize);
    const data = await Role.findAll({
        where: {name: { [Op.ne]: 'super_admin' }},
        include: [
            {
                model: Permission,
                through: { where: { granted: true }, attributes: ['granted'] },
                as: "permissions"
            }
        ],
        offset: (pageNumber - 1) * pageSize,
        limit: pageSize,
        order: [['updatedAt', 'DESC']], 
    });
    return res.status(200).json({ 
      success: true, 
      data,
      pagination: { total: dataCount, page: pageNumber, pageSize, totalPages,}
    });
  } catch (error) {
    console.error('Get All Roles Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error.', error: error.message});}
};


// === GET Role BY ID ===
exports.getRoleById = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await Role.findByPk(id,{
            include: [
                {
                    model: Permission,
                    through: { where: { granted: true }, attributes: ['granted'] },
                    as: "permissions"
                }
            ],
        });
        if (!user) {
            return res.status(404).json({ success: false, message: 'Role not found.' });
        }
        return res.status(200).json({ success: true, data: user });
    }
    catch (error) {
        console.error('Get Role By ID Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.',  error: error.message });
    }
}


// === GET MY ROLES ===
exports.getRolesByUser = async (req, res) => {
    if (!req.user.id) {
      return res.status(400).json({ success: false, message: 'Id is required.' });
    }
    try {
        const { page, limit } = req.query;
        const pageNumber = parseInt(page, 10) || 1;
        const pageSize = parseInt(limit, 10) || 10;
    
        const dataCount = await Role.count({ 
            include: [
                {
                    model: User,
                    as:'users',
                    where: { id: req.user.id },
                },
                {
                    model: Permission,
                    through: { where: { granted: true }, attributes: ['granted'] },
                    as: "permissions"
                }
            ],
            }
        );
        const totalPages = Math.ceil(dataCount / pageSize);
    
        const data = await Role.findAll({
            include: [
                {
                    model: User,
                    as:'users',
                    where: { id: req.user.id },
                },
                {
                    model: Permission,
                    through: { where: { granted: true }, attributes: ['granted'] },
                    as: "permissions"
                }
            ],
            offset: (pageNumber - 1) * pageSize,
            limit: pageSize,
            order: [['updatedAt', 'DESC']], 
        });
    
        if (!data) {
            return res.status(404).json({ success: false, message: `No role found with user ${req.user.id}.` });
        }
    
        return res.status(200).json({ 
            success: true, 
            data,
            pagination: { total: dataCount, page: pageNumber, pageSize, totalPages,}
        });
  
    } catch (error) {
      console.error('Get Roles By User Error:', error);
      return res.status(500).json({ success: false, message: 'Internal Server Error.', error: error.message });}
  };
  
  
// // === DELETE ROLE BY ID ===
// exports.deleteRoleById = async (req, res) => {
//     const { id } = req.params;
//     const t = await sequelize.transaction();
//     try {
//         const role = await Role.findOne({ where: { id }, transaction: t });
//         if (!role) {
//             await t.rollback();
//             return res.status(404).json({ success: false, message: 'Role not found.' });
//         }
//         // role.status = 'deleted';
//         // await role.save();
        
//         // await UserRole.destroy({ where: { role_id: id }, transaction: t });
//         // await RolePermission.destroy({ where: { role_id: id }, transaction: t });
//         // await role.destroy({ transaction: t });
//         await t.commit();
//         return res.status(200).json({ success: true, message: 'Role deleted successfully.' });
//     }
//     catch (error) {
//         await t.rollback();
//         console.error('Delete role By ID Error:', error);
//         return res.status(500).json({ success: false, message: 'Internal Server Error.',  error: error.message });
//     }
// }