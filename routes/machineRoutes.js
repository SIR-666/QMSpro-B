const express = require('express');
const router = express.Router();
const { getTransitions, getTransitionsAll } = require('../controllers/machineController');

// Define your routes
router.get('/transitions', getTransitions);
router.get('/transitionsAll/:MachineType/:month', getTransitionsAll);

module.exports = router; // Make sure this line is included
