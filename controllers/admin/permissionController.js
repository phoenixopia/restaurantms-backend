const { sequelize, Permission, Role, RolePermission } = require('../../models/index');


// === UPDATE PERMISSION ===
exports.updatePermission = async (req, res) => {
    const { name, granted } = req.body;

    if (!req.params.id || !name || !granted) {
        return res.status(400).json({ success: false, message: 'Missing the required fields.'});
    }

    const t = await sequelize.transaction();
    try {
        const existingRolePermission = await RolePermission.findByPk(req.params.id, { transaction: t });
        if (!existingRolePermission) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Permission not found.' });
        }

        existingRolePermission.granted = granted;
        await existingRolePermission.save({ transaction: t });
        await t.commit();

        return res.status(200).json({ success: true, message: 'Permission updated successfully.', data: existingRolePermission });

    } catch (error) {
        await t.rollback();
        console.error('Update Permission Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.', error: error.message });
    }
};



// === CREATE A NEW PERMISSION ===
exports.createPermission = async (req, res) => {
    const { name, granted, description, role_id } = req.body;
    const t = await sequelize.transaction();
    try {
        if (!name || !granted || !role_id) {
            return res.status(400).json({ success: false, message: 'Missing required fields.' });
        }

        const [newPermission, created] = await Permission.findOrCreate({
            where: { name },
            defaults: { name, description },
            transaction: t
        });

        if (!created) {
            await t.rollback();
            return res.status(400).json({ success: false, message: `A permission with ${name} already exists.` });
        }
        
        await RolePermission.findOrCreate({
            where: { permission_id: newPermission.id, role_id },
            defaults: { permission_id: newPermission.id, role_id, granted},
            transaction: t
        })

        await t.commit();
        return res.status(201).json({
            success: true,
            message: 'Permission created successfully.',
            data: newPermission
        });
    } catch (error) {
        await t.rollback();
        console.error('Create Permission Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.', error: error.message });
    }
};


// === GET ALL PERMISSIONS ===
exports.getAllPermissions = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const pageSize = parseInt(limit, 10) || 10;
    const dataCount = await Permission.count();
    const totalPages = Math.ceil(dataCount / pageSize);
    const data = await Permission.findAll({
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
    console.error('Get All Permissions Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error.', error: error.message});}
};


// === GET PERMISSION BY ID ===
exports.getPermissionById = async (req, res) => {
    const { id } = req.params;
    try {
        const data = await Permission.findByPk(id);
        if (!data) {
            return res.status(404).json({ success: false, message: 'Permission not found.' });
        }
        return res.status(200).json({ success: true, data });
    }
    catch (error) {
        console.error('Get Permission By ID Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.',  error: error.message });
    }
}


// === GET USER BY ROLE ===
exports.getPermissionByRole = async (req, res) => {
    const role_id = req.params.id
    if (!role_id) {
      return res.status(400).json({ success: false, message: 'Missing required field role_id.' });
    }
    try {
      const { page, limit } = req.query;
      const pageNumber = parseInt(page, 10) || 1;
      const pageSize = parseInt(limit, 10) || 10;
  
      const dataCount = await Role.count({ where: { id: role_id },});
      const totalPages = Math.ceil(dataCount / pageSize);
  
      const data = await Role.findByPk(role_id, {
        include: [
          {                    
            model: Permission,
            through: { attributes: [] },
          }],
        offset: (pageNumber - 1) * pageSize,
        limit: pageSize,
        order: [['updatedAt', 'DESC']], 
      });
  
      if (!data) {
        return res.status(404).json({ success: false, message: `No permission found with role ${role_id}.` });
      }
  
      return res.status(200).json({ 
        success: true, 
        data,
        pagination: { total: dataCount, page: pageNumber, pageSize, totalPages,}
      });
  
    } catch (error) {
      console.error('Get Permission By Role Error:', error);
      return res.status(500).json({ success: false, message: 'Internal Server Error.', error: error.message });}
  };
  

// // === DELETE PERMISSION BY ID ===
// exports.deletePermissionById = async (req, res) => {
//     const { id } = req.params;
//     if(!id){
//         return res.status(404).json({ success: false, message: 'Missing the required field id.' });
//     }
//     const t = await sequelize.transaction();
//     try {
//         const data = await Permission.findByPk(id, { transaction: t });
//         if (!data) {
//             await t.rollback();
//             return res.status(404).json({ success: false, message: 'Permission not found.' });
//         }
//         await RolePermission.destroy({ where: {permission_id: id }, transaction: t });
//         await data.destroy({ transaction: t });
//         await t.commit();
//         return res.status(200).json({ success: true, message: 'Permission deleted successfully.' });
//     }
//     catch (error) {
//         await t.rollback();
//         console.error('Delete Permission By ID Error:', error);
//         return res.status(500).json({ success: false, message: 'Internal Server Error.',  error: error.message });
//     }
// }