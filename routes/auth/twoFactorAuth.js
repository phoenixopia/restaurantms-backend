const express = require('express');
const twoFactorAuth = require('../../controllers/auth/twoFactorAuth');
const router = express.Router();
const { isAuthenticated, authorize } = require('../../middleware/auth');


// auth routes
router.get('/', isAuthenticated, authorize('admin', 'super-admin'), twoFactorAuth.setup2FA);

module.exports = router;

