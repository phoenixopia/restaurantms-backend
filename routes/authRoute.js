const express = require('express');
const authController = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();


// Authentication routes
router.post('/signup', authController.signup);
router.post('/login', protect, authorize('admin'), authController.signin);
router.post('/google-login', authController.googleLogin);
router.get('/logout', authController.logout);
router.post('/forgot-password', authController.forgot);
router.put('/reset-password/:reset_token', authController.reset);
router.put('/confirm/:confirmation_code', authController.confirm);

// 2FA routes
router.post('/setup-2fa', authController.setup2FA);

// Profile routes
router.get('/profile', protect, authController.getProfile);
router.put('/profile', protect, authController.updateProfile);
router.delete('/profile', protect, authController.deleteAccount);
router.put('/change-password', protect, authController.changePassword);


module.exports = router;