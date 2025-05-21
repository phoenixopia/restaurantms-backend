const { Op } = require('sequelize');
const { sendPasswordResetEmail, sendConfirmationEmail } = require('../utils/sendEmail');
const { sequelize, Users } = require('../models/index');
const { sendTokenResponse } = require('../utils/sendTokenResponse');
const { capitalizeFirstLetter } = require('../utils/capitalizeFirstLetter');
const { OAuth2Client } = require('google-auth-library');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { getClientIp } = require('../utils/getClientIp');



  // === Create a new user ===
  exports.createUser = async (req, res) => {
    const { firstName, lastName, email, phoneNumber, password, role } = req.body;
    const t = await sequelize.transaction();
    try {
        if (!firstName || !lastName || !email || !password || !role) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }
        if (!/\S+@\S+\.\S+/.test(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email format.' });
        }
        const userData = {
            firstName: capitalizeFirstLetter(firstName),
            lastName: capitalizeFirstLetter(lastName),
            email: email.toLowerCase(),
            phoneNumber,
            password,
            role,
            isConfirmed: true,
            confirmationCode: "",
        };
        const [newUser, created] = await Users.findOrCreate({
            where: { email: { [Op.iLike]: email } },
            defaults: userData,
            transaction: t
        });
        if (!created) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'Email already in use.' });
        }
        const confirmationLink = `${process.env.CLIENT_URL}/confirm/${newUser.confirmationCode}`;
        await sendConfirmationEmail(newUser.email, newUser.firstName, newUser.lastName, confirmationLink);
        await t.commit();
        return res.status(201).json({
            success: true,
            message: 'User created successfully. Please check your email for confirmation to verify your account.',
            user: {
                id: newUser.id,
                email: newUser.email,
                isConfirmed: newUser.isConfirmed,
                role: newUser.role,
                phoneNumber: newUser.phoneNumber,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
            }
        });
    } catch (error) {
        await t.rollback();
        console.error('Create User Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};


// === GET ALL USERS ===
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const pageSize = parseInt(limit, 10) || 10;
    const userCount = await Users.count();
    const totalPages = Math.ceil(userCount / pageSize);
    const users = await Users.findAll({
      // where: { role: {[Op.ne]: 'super-admin'}},
      // include: [
      //   { model: Notifications, as: 'notification'},
      // ],
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
        const user = await Users.findOne({
            where: { id },
            attributes: { exclude: ['password', 'resetToken', 'confirmationCode'] }
        });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        return res.status(200).json({ success: true, data: user });
    }
    catch (error) {
        console.error('Get User By ID Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
}


// === UPDATE USER BY ID ===
exports.updateUserById = async (req, res) => {
  const { id } = req.params;
  if (!id) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
  }

  const { firstName, lastName, email, phoneNumber, role } = req.body;
  const t = await sequelize.transaction();
  try {
      if (!firstName && !lastName && !email && !phoneNumber && !role) {
          return res.status(400).json({ success: false, message: 'At least one field is required to update.' });
      }

      const user = await Users.findOne({ where: { id }, transaction: t });
      if (!user) {
          await t.rollback();
          return res.status(404).json({ success: false, message: 'User not found.' });
      }

      if (firstName) user.firstName = capitalizeName(firstName);
      if (lastName) user.lastName = capitalizeName(lastName);
      if (email) user.email = email.toLowerCase();
      if (phoneNumber) user.phoneNumber = phoneNumber;
      if (role) user.role = role;

      await user.save({ transaction: t });
      await t.commit();

      return res.status(200).json({ success: true, message: 'User updated successfully.', data: user });
  } catch (error) {
      await t.rollback();
      console.error('Update User By ID Error:', error);
      return res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
};


// === DELETE USER BY ID ===
exports.deleteUserById = async (req, res) => {
    const { id } = req.params;
    const t = await sequelize.transaction();
    try {
        const user = await Users.findOne({ where: { id }, transaction: t });
        if (!user) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        await user.destroy({ transaction: t });
        await t.commit();
        return res.status(200).json({ success: true, message: 'User deleted successfully.' });
    }
    catch (error) {
        await t.rollback();
        console.error('Delete User By ID Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
}
// === GET USER BY EMAIL ===
exports.getUserByEmail = async (req, res) => {
    const { email } = req.params;
    try {
        const user = await Users.findOne({
            where: { email: { [Op.iLike]: email } },
            attributes: { exclude: ['password', 'resetToken', 'confirmationCode'] }
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
        const user = await Users.findOne({
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
exports.getUserByRole = async (req, res) => {
  const { role } = req.params;
  if (!role) {
    return res.status(400).json({ success: false, message: 'Role is required.' });
  }
  if (!['super-admin', 'admin', 'user', 'customer'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role.' });
  }
  try {
    const { page, limit } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const pageSize = parseInt(limit, 10) || 10;

    const userCount = await Users.count({where: { role },});
    const totalPages = Math.ceil(userCount / pageSize);

    const users = await Users.findAll({
      where: { role },
      attributes: { exclude: ['password', 'resetToken', 'confirmationCode'] },
      offset: (pageNumber - 1) * pageSize,
      limit: pageSize,
      order: [['updatedAt', 'DESC']], 
    });

    if (!users) {
      return res.status(404).json({ success: false, message: 'No users found with this role.' });
    
    }
    return res.status(200).json({ 
      success: true, 
      data: users,
      pagination: { total: userCount, page: pageNumber, pageSize, totalPages,}
    });
  } catch (error) {
    console.error('Get Users By Role Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error.' });}
};


// === GET USER BY USER TYPE ===
exports.getUserByUserType = async (req, res) => {
  const { userType } = req.params;
  if (!userType) {
    return res.status(400).json({ success: false, message: 'User type is required.' });
  }
  if (!['system-user', 'end-user'].includes(userType)) {
    return res.status(400).json({ success: false, message: 'Invalid user type.' });
  }

  try {
    const { page, limit } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const pageSize = parseInt(limit, 10) || 10;

    const userCount = await Users.count({
      where: { userType },
    });
    const totalPages = Math.ceil(userCount / pageSize);

    const users = await Users.findAll({
      where: { userType },
      attributes: { exclude: ['password', 'resetToken', 'confirmationCode'] },
      offset: (pageNumber - 1) * pageSize,
      limit: pageSize,
      order: [['updatedAt', 'DESC']], 
    });

    if (!users) {
      return res.status(404).json({ success: false, message: 'No users found with this user type.' });
    }

    return res.status(200).json({ 
      success: true, 
      data: users,
      pagination: { total: userCount, page: pageNumber, pageSize, totalPages,}
    });
  } catch (error) {
    console.error('Get User By User Type Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error.' });
  };
}
