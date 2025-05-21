const express = require('express');
const userController = require('../../controllers/admin/userController');
const router = express.Router();
const { isAuthenticated, authorize } = require('../../middleware/auth');


// Admin routes
router.get('/', isAuthenticated, authorize('admin', 'super-admin'), userController.getAllUsers);
router.post('/', isAuthenticated, authorize('admin', 'super-admin'), userController.createUser);
router.get('/:id', isAuthenticated, authorize('admin', 'super-admin'), userController.getUserById);
router.put('/:id', isAuthenticated, authorize('admin', 'super-admin'), userController.updateUserById);
router.delete('/:id', isAuthenticated, authorize('admin', 'super-admin'), userController.deleteUserById);


router.get('/email/:email', isAuthenticated, authorize('admin', 'super-admin'), userController.getUserByEmail);
router.get('/phone/:phone_umber', isAuthenticated, authorize('admin', 'super-admin'), userController.getUserByPhoneNumber);
router.get('/role/:id', isAuthenticated, authorize('admin', 'super-admin'), userController.getUsersByRole);
router.get('/restaurant/:id', isAuthenticated, authorize('admin', 'super-admin'), userController.getUsersForRestaurant);


module.exports = router;