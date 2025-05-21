const { sequelize, Role, RolePermission } = require('../../models/index');


// === UPDATE Role ===
exports.updateRole = async (req, res) => {
    const { role } = req.body;

    if (!req.params.id || role) {
        return res.status(400).json({ success: false, message: 'Missing the required field id.'});
    }

    const t = await sequelize.transaction();
    try {
        const existingRole = await Role.findByPk(req.params.id, { transaction: t });
        if (!existingRole) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Role not found.' });
        }

        const newRole = await Role.findOne({ name: role })
        if(newRole){
            await t.rollback();
            return res.status(400).json({ success: false, message: 'New role name already exists. Please use another name.' });
        }

        existingRole.name = role;
        await existingRole.save({ transaction: t });
        await t.commit();

        return res.status(200).json({ success: true, message: 'Role updated successfully.', data: existingRole });

    } catch (error) {
        await t.rollback();
        console.error('Update  Role Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.', error: error.message });
    }
};



// === Create a new role ===
exports.createRole = async (req, res) => {
    const { name, description, permission_id } = req.body;
    const t = await sequelize.transaction();
    try {
        if (!name) {
            return res.status(400).json({ success: false, message: 'Missing required fields.' });
        }

        const [newRole, created] = await Role.findOrCreate({
            where: { name },
            defaults: { ...req.body },
            transaction: t
        });

        if (!created) {
            await t.rollback();
            return res.status(400).json({ success: false, message: `A role with ${name} already exists.` });
        }

        
        await RolePermission.findOrCreate({
            where: { role_id: newRole.id, permission_id },
            defaults: {role_id: newRole.id, permission_id},
            transaction: t
        })

        await t.commit();
        return res.status(201).json({
            success: true,
            message: 'Role created successfully.',
            data: newRole
        });
    } catch (error) {
        await t.rollback();
        console.error('Create Role Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.', error: error.message });
    }
};


// === GET ALL Roles ===
exports.getAllRoles = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const pageSize = parseInt(limit, 10) || 10;
    const dataCount = await Role.count();
    const totalPages = Math.ceil(dataCount / pageSize);
    const data = await Role.findAll({
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
        const user = await Role.findByPk(id);
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
                    where: { id: req.user.id },
                },
            ],
            }
        );
        const totalPages = Math.ceil(dataCount / pageSize);
    
        const data = await Role.findAll({
            include: [
                {
                    model: User,
                    where: { id: req.user.id },
                },
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
//         role.status = 'deleted';
//         await role.save();
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