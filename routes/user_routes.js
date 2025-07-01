const express = require('express');
const userController = require('../controllers/userController');
const router = express.Router();
const { protect } = require('../middleware/protect');
const { authorize } = require('../middleware/authorize');


// Admin routes
router.get('/', protect, authorize('admin', 'super_admin'), userController.getAllUsers);
router.post('/', protect, authorize('admin', 'super_admin'), userController.createUser);
router.get('/:id', protect, authorize('admin', 'super_admin'), userController.getUserById);
router.put('/:id', protect, authorize('admin', 'super_admin'), userController.updateUserById);
router.delete('/:id', protect, authorize('admin', 'super_admin'), userController.deleteUserById);


router.get('/email/:email', protect, authorize('admin', 'super_admin'), userController.getUserByEmail);
router.get('/phone/:phone_number', protect, authorize('admin', 'super_admin'), userController.getUserByPhoneNumber);
router.get('/role/:id', protect, authorize('admin', 'super_admin'), userController.getUsersByRole);
router.get('/restaurant/:id', protect, authorize('admin', 'super_admin'), userController.getUsersForRestaurant);


module.exports = router;