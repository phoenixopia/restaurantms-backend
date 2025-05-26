const express = require('express');
const twoFactorAuth = require('../controllers/twoFactorAuth');
const router = express.Router();
const { protect } = require('../middleware/protect');
const { authorize } = require('../middleware/authorize');


// auth routes
router.get('/', protect, authorize('admin', 'super-admin'), twoFactorAuth.setup2FA);

module.exports = router;

