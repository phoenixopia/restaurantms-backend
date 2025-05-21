const express = require('express');
const authController = require('../../controllers/auth/authController');
const { isAuthenticated, authorize } = require('../../middleware/auth');
const router = express.Router();


// Authentication routes
router.post('/signup', authController.signup);
router.post('/login', isAuthenticated, authorize('admin'), authController.signin);
router.post('/google-login', authController.googleLogin);
router.get('/logout', authController.logout);
router.post('/forgot-password', authController.forgot);
router.put('/reset-password/:reset_token', authController.reset);
router.put('/confirm/:confirmation_code', authController.confirm);


// Profile routes
router.get('/profile', isAuthenticated, authController.getProfile);
router.put('/profile', isAuthenticated, authController.updateProfile);
router.delete('/profile', isAuthenticated, authController.deleteAccount);
router.put('/change-password', isAuthenticated, authController.changePassword);


module.exports = router;