const { Op } = require('sequelize');
const { sequelize, User, Role, Restaurant, Permission, RestaurantUser } = require('../models/index');
const { capitalizeFirstLetter, capitalizeName } = require('../utils/capitalizeFirstLetter');
const { hashPassword } = require('../utils/hash');
const { logActivity } = require('./activityController');


// === Create a new user ===
exports.createUser = async (req, res) => {
  const {
    first_name,
    last_name,
    email,
    phone_number,
    password,
    role_id,
    restaurant_id // single restaurant id (string or number)
  } = req.body;

  const t = await sequelize.transaction();

  try {
    if (!first_name || !last_name || !email || !password || !role_id || !restaurant_id) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format.' });
    }

    if (phone_number && !/^\+?[1-9]\d{9,14}$/.test(phone_number)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number. Must be in E.164 format (e.g., +251987654321)',
      });
    }

    const existingUser = await User.findOne({
      where: { email: { [Op.iLike]: email } },
      transaction: t
    });
    if(existingUser){
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Email already in use.' });
    }

    // Create user data without restaurant_id here:
    const userData = {
      first_name: capitalizeFirstLetter(first_name),
      last_name: capitalizeFirstLetter(last_name),
      email: email.toLowerCase(),
      phone_number,
      // password: await hashPassword(password),
      password,
      role_id,
      isConfirmed: true,
      confirmationCode: ""
    };

    const newUser = await User.create(userData, { transaction: t });

    // Create entry in join table RestaurantUser
    await RestaurantUser.create({
      user_id: newUser.id,
      restaurant_id: restaurant_id
    }, { transaction: t });

    await t.commit();

    await logActivity({
      user_id: newUser.id,
      action: 'create_user',
      entity_type: 'User',
      entity_id: newUser.id,
      // metadata: { changed_fields: ['email', 'role_id', 'pass'] },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });    

    return res.status(201).json({
      success: true,
      message: 'User created successfully and linked to restaurant.',
      user: newUser
    });
  } catch (error) {
    await t.rollback();
    console.error('Create User Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error.', error: error.message });
  }
};


// === GET ALL USERS ===
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const pageSize = parseInt(limit, 10) || 10;
    const userCount = await User.count();
    const totalPages = Math.ceil(userCount / pageSize);
    const users = await User.findAll({
      include: [
        {                    
          model: Role,
          as: "role",
        }
      ],
      offset: (pageNumber - 1) * pageSize,
      limit: pageSize,
      order: [['updatedAt', 'DESC']], 
    });
    return res.status(200).json({ 
      success: true, 
      data: users,
      pagination: { total: userCount, page: pageNumber, pageSize, totalPages,}
    });
  } catch (error) {
    console.error('Get All Users Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error.' });}
};


// === GET USER BY ID ===
exports.getUserById = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await User.findByPk(id, {
            include: [
              {                    
                model: Role,
                as: "role",
                include: [
                    {
                        model: Permission,
                        through: { attributes: [] },
                        as: "permissions"
                    }
                ]
              },
              {                    
                model: Restaurant,
                as: "restaurants",
              }
            ],
          }
        );
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        return res.status(200).json({ success: true, data: user });
    }
    catch (error) {
        console.error('Get User By ID Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.', error: error.message });
    }
}

// === UPDATE USER BY ID ===
exports.updateUserById = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ success: false, message: 'User ID is required.' });
  }

  const { first_name, last_name, email, phone_number, role_id, restaurant_ids } = req.body;
  const t = await sequelize.transaction();
  try {
    if (!first_name && !last_name && !email && !phone_number && !role_id && !restaurant_ids) {
      return res.status(400).json({ success: false, message: 'At least one field is required to update.' });
    }

    const user = await User.findByPk(id, {
      include: [{ model: Role, as: "role" }],
      transaction: t
    });

    if (!user) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user?.role?.name === "super_admin") {
      await t.rollback();
      return res.status(400).json({ success: false, message: `User with role ${user.role.name} is not editable.` });
    }

    if (first_name) user.first_name = capitalizeName(first_name);
    if (last_name) user.last_name = capitalizeName(last_name);
    if (email) user.email = email.toLowerCase();
    if (phone_number) user.phone_number = phone_number;
    if (role_id) user.role_id = role_id;

    // === Sync RestaurantUser relationship ===
    if (Array.isArray(restaurant_ids)) {
      // Remove existing associations
      await RestaurantUser.destroy({
        where: { user_id: id },
        transaction: t
      });

      // Create new associations
      const newLinks = restaurant_ids.map(restaurantId => ({
        user_id: id,
        restaurant_id: restaurantId
      }));
      await RestaurantUser.bulkCreate(newLinks, { transaction: t });
    }

    await user.save({ transaction: t });
    await t.commit();

    await logActivity({
      user_id: req.user.id,
      action: 'update_user',
      entity_type: 'User',
      entity_id: updatedUser.id,
      // metadata: { changed_fields: ['email', 'role_id'] },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    

    return res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      data: user
    });

  } catch (error) {
    await t.rollback();
    console.error('Update User By ID Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error.',
      error: error.message
    });
  }
};


// === DELETE USER BY ID ===
exports.deleteUserById = async (req, res) => {
    const { id } = req.params;
    const t = await sequelize.transaction();
    try {
        const user = await User.findByPk(id, {
          include: [{ model: Role, as: "role" }], transaction: t 
        });

        if (!user) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (user?.role?.name === "super_admin") {
          await t.rollback();
          return res.status(400).json({ success: false, message: `User with role ${user.role.name} is not editable.` });
        }

        // await UserRole.destroy({ where: { user_id: id }, transaction: t });
        await user.destroy({ transaction: t });
        await t.commit();

        await logActivity({
          user_id: id,
          action: 'delete_user',
          entity_type: 'User',
          entity_id: user.id,
          // metadata: { changed_fields: ['email', 'role_id'] },
          ip_address: req.ip,
          user_agent: req.headers['user-agent']
        });
        
        return res.status(200).json({ success: true, message: 'User deleted successfully.' });
    }
    catch (error) {
        await t.rollback();
        console.error('Delete User By ID Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.', error: error.message });
    }
}


// === GET USER BY EMAIL ===
exports.getUserByEmail = async (req, res) => {
    const { email } = req.params;
    try {
        const user = await User.findOne({
            where: { email: { [Op.iLike]: email } },
        });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        return res.status(200).json({ success: true, data: user });
    }
    catch (error) {
        console.error('Get User By Email Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
}

// === GET USER BY PHONE NUMBER ===
exports.getUserByPhoneNumber = async (req, res) => {
    const { phoneNumber } = req.params;
    try {
        const user = await User.findOne({
            where: { phoneNumber },
            attributes: { exclude: ['password', 'resetToken', 'confirmationCode'] }
        });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        return res.status(200).json({ success: true, data: user });
    }
    catch (error) {
        console.error('Get User By Phone Number Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
}


// === GET USER BY ROLE ===
exports.getUsersByRole = async (req, res) => {
  const { role_id } = req.params.id;
  if (!role_id) {
    return res.status(400).json({ success: false, message: 'Role id is required.' });
  }
  try {
    const { page, limit } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const pageSize = parseInt(limit, 10) || 10;

    const dataCount = await User.count({ 
          where: { role_id },
    });
    const totalPages = Math.ceil(dataCount / pageSize);

    const data = await User.findAll({
      where: { role_id },
      offset: (pageNumber - 1) * pageSize,
      limit: pageSize,
      order: [['updatedAt', 'DESC']], 
    });

    if (!data) {
      return res.status(404).json({ success: false, message: `No users found with role ${role}.` });
    }

    return res.status(200).json({ 
      success: true, 
      data,
      pagination: { total: dataCount, page: pageNumber, pageSize, totalPages,}
    });

  } catch (error) {
    console.error('Get Users By Role Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error.', error: error.message });}
};



// === GET USER FOR RESTAURANT ===
exports.getUsersForRestaurant = async (req, res) => {
  const { restaurant_id } = req.params.id;
  if (!restaurant_id) {
    return res.status(400).json({ success: false, message: 'Missing required field id.' });
  }

  try {
    const { page, limit } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const pageSize = parseInt(limit, 10) || 10;

    const userCount = await User.count({ 
      include: [
        {
          model: Restaurant,
          where: { id: restaurant_id },
        },
      ],
    });
    const totalPages = Math.ceil(userCount / pageSize);

    const usersData = await User.findAll({
      include: [
        {
          model: Restaurant,
          where: { id: restaurant_id },
        },
      ],
      offset: (pageNumber - 1) * pageSize,
      limit: pageSize,
      order: [['updatedAt', 'DESC']], 
    });

    if (!usersData) {
      return res.status(404).json({ success: false, message: `No users found for restaurant ${restaurant_id}.` });
    }

    return res.status(200).json({ 
      success: true, 
      data: usersData,
      pagination: { total: userCount, page: pageNumber, pageSize, totalPages,}
    });

  } catch (error) {
    console.error('Get Users For Restaurant Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error.', error: error.message });}
};
