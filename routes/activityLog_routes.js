const express = require('express');
const activityController = require('../controllers/activityController');
const { protect } = require('../middleware/protect');
const { authorize } = require('../middleware/authorize');
const router = express.Router();


// routes
router.get('/', protect, activityController.getAllActivity);


module.exports = router;