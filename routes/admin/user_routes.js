const express = require('express');
const userController = require('../../controllers/admin/userController');
const router = express.Router();
const { protect } = require('../../middleware/protect');
const { authorize } = require('../../middleware/authorize');


// Admin routes
router.get('/', protect, authorize('admin', 'super-admin'), userController.getAllUsers);
router.post('/', protect, authorize('admin', 'super-admin'), userController.createUser);
router.get('/:id', protect, authorize('admin', 'super-admin'), userController.getUserById);
router.put('/:id', protect, authorize('admin', 'super-admin'), userController.updateUserById);
router.delete('/:id', protect, authorize('admin', 'super-admin'), userController.deleteUserById);


router.get('/email/:email', protect, authorize('admin', 'super-admin'), userController.getUserByEmail);
router.get('/phone/:phone_umber', protect, authorize('admin', 'super-admin'), userController.getUserByPhoneNumber);
router.get('/role/:id', protect, authorize('admin', 'super-admin'), userController.getUsersByRole);
router.get('/restaurant/:id', protect, authorize('admin', 'super-admin'), userController.getUsersForRestaurant);


module.exports = router;