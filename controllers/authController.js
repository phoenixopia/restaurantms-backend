const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const { sendPasswordResetEmail, sendConfirmationEmail } = require('../utils/sendEmail');
const { sequelize, User, Role, Permission } = require('../models/index');
const { sendTokenResponse } = require('../utils/sendTokenResponse');
const { capitalizeFirstLetter } = require('../utils/capitalizeFirstLetter');
const { OAuth2Client } = require('google-auth-library');
const speakeasy = require('speakeasy');
const { getClientIp } = require('../utils/getClientIp');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);



// === Gooogle Sign In ===
exports.googleLogin = async (req, res) => {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Missing required field.' });
    }
    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      const { email, given_name, family_name } = payload;
  
      // Check if user exists
      let user = await User.findOne({ where: { email } });
      if (!user) {
        user = await User.create({
          email,
          first_name: given_name,
          last_name: family_name,
          isConfirmed: true,
          provider: 'google',
        });
      }
  
      // Send token
      sendTokenResponse(user, 200, res);
    } catch (error) {
      console.error('Google Login Error:', error);
      res.status(401).json({ success: false, message: 'Google authentication failed' });
    }
  };
  
  
  
  // === CUSTOMER SIGNUP ===
  exports.signup = async (req, res) => {
      const { first_name, last_name, email, phone_number, password } = req.body;
      const t = await sequelize.transaction();
      try {
        if (!first_name || !last_name || !email || !password) {
          return res.status(400).json({ success: false, message: 'All fields are required.' });
        }
    
        if (!/\S+@\S+\.\S+/.test(email)) {
          return res.status(400).json({ success: false, message: 'Invalid email format.' });
        }

        // E.164 format RegEx
        if (phone_number && !/^\+?[1-9]\d{9,14}$/.test(phone_number)) {
          return res.status(400).json({ success: false, error: 'Invalid phone number. Must be in E.164 format (e.g., +12345678901)',});
        }

        const existingUser = await User.findOne({
          where: {
            [Op.or]: [{ email }, { phone_number }],
          },
        });
    
        if (existingUser) {
          await t.rollback();
          return res.status(400).json({ success: false, message: 'Email already in use.' });
        }

        const role = await Role.findOne({ where: { name: "customer" },});

        const newUser = await User.create({
          first_name,
          last_name,
          email,
          phone_number,
          password,
          role_id: role.id,
        });
    
        const confirmationLink = `${process.env.CLIENT_URL}/confirm/${newUser.confirmation_code}`;
        await sendConfirmationEmail(newUser.email, newUser.first_name, newUser.last_name, confirmationLink);
    
        await t.commit();
        return res.status(201).json({
          success: true,
          message: 'Please check your email for confirmation to verify your account.',
          data: newUser
        });
      } catch (error) {
        await t.rollback();
        console.error('Signup Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.', error: error.message });
      }
    };
    
  
    // === CUSTOMER CONFIRMATION ===
    exports.confirm = async (req, res) => {
      const { email, device_type } = req.body;
      const { confirmation_code } = req.params;
    
      if (!email || !confirmation_code) {
        return res.status(400).json({ success: false, message: 'Missing confirmation code or email.' });
      }
    
      const t = await sequelize.transaction();
      try {
        const user = await User.findOne({
          where: {
            confirmation_code,
            email: { [Op.iLike]: email },
            isConfirmed: false
          },
          include: [
            {
                model: Role,
                include: [
                  {
                      model: Permission,
                  },
              ],
            },
        ],
          lock: t.LOCK.UPDATE,
          transaction: t
        });
    
        if (!user) {
          await t.rollback();
          return res.status(404).json({
            success: false,
            message: 'Account already confirmed or does not exist.'
          });
        }
    
        user.isConfirmed = true;
        user.confirmation_code = "";
        user.last_login_at = new Date();
        await user.save({ transaction: t });

        const ip = getClientIp(req);
        user.markSuccessfulLogin(ip, device_type);
        await t.commit();
    
        return sendTokenResponse(user, 200, res);
      } catch (error) {
        await t.rollback();
        console.error('Confirmation Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
      }
    };
    

    // === SIGNIN ===
    exports.signin = async (req, res) => {
      const { email, password , device_type, code} = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Please provide email and password.' });
      }
  
      const t = await sequelize.transaction();
      try {
    
        const user = await User.findOne({
          where: { email: { [Op.iLike]: email } },
          include: [
            {
                model: Role,
                attributes: { exclude: ['createdAt', 'updatedAt'] },
                as: 'roles',
                include: [
                  {
                      model: Permission,
                      through: { attributes: ["granted"] },
                      attributes: { exclude: ['createdAt', 'updatedAt'] },
                      as: "permissions"
                  },
              ],
            },
          ],
          attributes: { include: ['password'] },
          // lock: t.LOCK.UPDATE,
          transaction: t
        });
    
        if (!user) {
          await t.rollback();
          return res.status(404).json({ success: false, message: 'No account found with this email.' });
        }

        console.log('\n\nUser found:', user.roles);
    
        if (!user.isConfirmed) {
          await t.rollback();
          return res.status(400).json({ success: false, message: 'Email not confirmed. Please check your inbox.' });
        }
  
        if (user.isLocked()) {
          await t.rollback();
          return res.status(403).json({ success: false, message: `Your account is locked until ${user.locked_until}. Please try again later.`});
        }

        const isMatched = await user.comparePassword(password);

        // const isMatched = await comparePassword(password, user.password)
        if (!isMatched) {
          await t.rollback();
          user.markFailedLoginAttempt();
          return res.status(400).json({ success: false, message: `Invalid credentials. Your remaining atemts are ${5-user.failed_login_attempts}` });
        }
       
        // Reset failed login attempts on successful login
        const ip = getClientIp(req);
        user.markSuccessfulLogin(ip, device_type);
  
  
        if (user.two_factor_enabled) {
          if (!code) {
            return res.status(400).json({success: false, message: '2FA code required' });
          }
        
          const isVerified = speakeasy.totp.verify({
            secret: user.two_factor_secret,
            encoding: 'base32',
            token: code,
            window: 1,
          });
        
          if (!isVerified) {
            return res.status(401).json({ message: 'Invalid 2FA code' });
          }
        }
  
        await t.commit();
        return sendTokenResponse(user, 200, res);
      } catch (error) {
        console.error('Signin Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.', error: error.message });
      }
    };
  
  
  //logout
  exports.logout = async (req, res, next) => {
    try{
      res.clearCookie('token');
      req.headers['authorization'] = '';
      return res.status(204).json({success: true, message: "Successfully logged out." })
    }catch(err){
      console.error(err);
      return res.status(500).json({ success: false, message: err.message, stack: err.stack });
    }
  }
  
  
  //user forgot password
  exports.forgot = async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Please provide an email." });
    }
    const t = await sequelize.transaction();
    try {
      const user = await User.findOne({ where: { email: { [Op.iLike]: email } }, transaction: t });
  
      if (!user) {
        await t.rollback();
        return res.status(404).json({ success: false, message: "No account found with this email." });
      }
  
      // Generate a unique reset code
      const reset_token = user.getResetPasswordToken();
  
      // Save the token in DB
      user.reset_token = reset_token;
      await user.save({ transaction: t });
  
      const resetLink = `${process.env.CLIENT_URL}/reset-password/${reset_token}`;
  
      // Send reset email
      await sendPasswordResetEmail(user.email, resetLink);
      await t.commit();
      return res.status(200).json({ success: true, message: "Reset code sent successfully." });
    } catch (error) {
      await t.rollback();
      console.error("Forgot password error:", error);
      return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  };
  
  
  // User Reset Password
  exports.reset = async (req, res) => {
      const { email, password } = req.body;
      const { reset_token } = req.params;
  
      if (!password || !reset_token) {
          return res.status(400).json({ success: false, message: "Password and token are required." });
      }
      // Validate password length
      if (password.length < 8) {
          return res.status(400).json({ success: false, message: "Password must be at least 8 characters long." });
      }
  
      const t = await sequelize.transaction();
      try {
  
          const decoded = jwt.verify(reset_token, process.env.JWT_SECRET);
          const user = await User.findOne({ where: { id: decoded.id, reset_token }, transaction: t });
  
          if (!user) {
              await t.rollback();
              return res.status(404).json({ success: false, message: "Invalid or expired reset token." });
          }
  
          // Update the password
          user.password = password;
          user.reset_token = null;
          await user.save({ transaction: t });
  
          await t.commit();
          return res.status(200).json({ success: true, message: "Password reset successfully. You can now log in." });
  
      } catch (error) {
          await t.rollback();
          console.error("Password reset error:", error);
          return res.status(500).json({ success: false, message: "An error occurred while resetting the password.", error: error.message });
      }
};



// === GET USER PROFILE ===
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findOne({
          where: { id: req.user.id },
          attributes: { exclude: ['password', 'reset_token', 'confirmation_code'] }
        });
    
        if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
        }
    
        return res.status(200).json({ success: true, data: user });
    } catch (error) {
        console.error('Get Profile Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};


// === UPDATE USER PROFILE ===
exports.updateProfile = async (req, res) => {
  const { firstName, lastName, phoneNumber } = req.body;

  if (!firstName && !lastName && !phoneNumber) {
    return res.status(400).json({
      success: false,
      message: 'At least one field (firstName, lastName, phoneNumber) must be provided for update.'
    });
  }

  const t = await sequelize.transaction();
  try {
    const user = await User.findByPk(req.user.id, { transaction: t });

    if (!user) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Only update provided fields
    if (firstName) user.firstName = capitalizeFirstLetter(firstName);
    if (lastName) user.lastName = capitalizeFirstLetter(lastName);
    if (phoneNumber) user.phoneNumber = phoneNumber;

    await user.save({ transaction: t });
    await t.commit();

    const updatedUser = await User.findByPk(user.id, {
      attributes: { exclude: ['password', 'reset_token', 'confirmation_code'] }
    });

    return res.status(200).json({ success: true, message: 'Profile updated successfully.', data: updatedUser });

  } catch (error) {
    await t.rollback();
    console.error('Update Profile Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
};


// === DELETE USER ACCOUNT ===
exports.deleteAccount = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const user
    = await User.findOne({ where: { id: req.user.id }, transaction: t });
        if (!user) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
    
        await user.destroy({ transaction: t });
        await t.commit();
    
        res.clearCookie('token');
        req.headers['authorization'] = '';
        return res.status(200).json({ success: true, message: 'Account deleted successfully.' });
    }
    catch (error) {
        await t.rollback();
        console.error('Delete Account Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
}


// === CHANGE PASSWORD ===
exports.changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const t = await sequelize.transaction();
    try {
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }
    
        const user = await User.findOne({ where: { id: req.user.id }, attributes: { include: ['password'] }, transaction: t });
    
        if (!user) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
    
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            await t.rollback();
            return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
        }
    
        user.password = newPassword;
        await user.save({ transaction: t });
        await t.commit();
    
        return res.status(200).json({ success: true, message: 'Password changed successfully.' });
    } catch (error) {
        await t.rollback();
        console.error('Change Password Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
}