/**
 * reservationRoutes.js
 */

const express = require('express');
const router = express.Router();
const {
  reserveBed,
  getReservations,
  deleteReservation,
} = require('../controllers/reservationController');

router.get('/', getReservations);
router.post('/', reserveBed);
router.delete('/:id', deleteReservation);

module.exports = router;
