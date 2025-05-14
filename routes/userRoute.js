const express = require('express');
const userController = require('../controllers/userController');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');


// Admin routes
router.get('/', protect, authorize('admin', 'super-admin'), userController.getAllUsers);
router.post('/', protect, authorize('admin', 'super-admin'), userController.createUser);
router.get('/:id', protect, authorize('admin', 'super-admin'), userController.getUserById);
router.put('/:id', protect, authorize('admin', 'super-admin'), userController.updateUserById);
router.delete('/:id', protect, authorize('admin', 'super-admin'), userController.deleteUserById);


router.get('/email/:email', protect, authorize('admin', 'super-admin'), userController.getUserByEmail);
router.get('/phone/:phone_umber', protect, authorize('admin', 'super-admin'), userController.getUserByPhoneNumber);
router.get('/role/:role', protect, authorize('admin', 'super-admin'), userController.getUserByRole);
router.get('/type/:user_type', protect, authorize('admin', 'super-admin'), userController.getUserByUserType);


module.exports = router;