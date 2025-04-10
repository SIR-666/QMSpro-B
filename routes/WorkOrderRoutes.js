const express = require('express');
const router = express.Router();
const { getWaterYogurt } = require('../controllers/utilityController');

// Define routes
router.get('/wateryogurt', getWaterYogurt);
// Define other utility-related routes...

module.exports = router;
