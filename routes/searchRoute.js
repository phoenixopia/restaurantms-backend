const express = require('express');
const { searchAll } = require('../controllers/searchController');
const router = express.Router();


// auth routes
router.get('/', searchAll);

module.exports = router;

