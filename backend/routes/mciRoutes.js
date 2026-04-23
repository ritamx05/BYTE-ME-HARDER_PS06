/**
 * mciRoutes.js
 */

const express = require('express');
const router = express.Router();
const { toggleMCI, getMode } = require('../controllers/mciController');

router.get('/mode', getMode);
router.post('/toggle-mci', toggleMCI);

module.exports = router;
