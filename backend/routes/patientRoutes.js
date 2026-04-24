/**
 * patientRoutes.js
 */

const express = require('express');
const router = express.Router();
const { addPatient, getPatients } = require('../controllers/patientController');

router.get('/', getPatients);
router.post('/', addPatient);

module.exports = router;
