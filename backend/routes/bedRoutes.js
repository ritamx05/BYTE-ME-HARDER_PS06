/**
 * bedRoutes.js
 */

const express = require('express');
const router = express.Router();
const { getBeds, assignNextBed } = require('../controllers/bedController');

router.get('/', getBeds);
router.post('/assign', assignNextBed);

module.exports = router;
