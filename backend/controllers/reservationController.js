/**
 * reservationController.js
 * Handles HTTP request/response logic for ghost reservations.
 */

const {
  getAllReservations,
  createReservation,
  cancelReservation,
} = require('../services/reservationService');
const { findAvailableBed, getAllBeds, getBedStats } = require('../services/bedService');
const { getSystemMode } = require('../services/systemState');

/**
 * POST /reserve
 * Reserve an available bed for an incoming ambulance patient.
 * Body: { note?: string, bedId?: string }
 * If bedId is not provided, auto-picks the first available bed.
 */
function reserveBed(req, res) {
  const { note, bedId: requestedBedId } = req.body;

  let targetBedId = requestedBedId;

  if (!targetBedId) {
    const bed = findAvailableBed();
    if (!bed) {
      return res.status(400).json({ error: 'No available beds for reservation.' });
    }
    targetBedId = bed.id;
  }

  const result = createReservation(targetBedId, note || '');
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  console.log(`[RESERVE] Bed ${targetBedId} reserved. Reservation ID: ${result.reservation.id}`);

  const io = req.app.get('io');
  if (io) {
    io.emit('beds_updated', { stats: getBedStats(), beds: getAllBeds() });
    io.emit('reservations_updated', { reservations: getAllReservations() });
  }

  return res.status(201).json({
    message: `Bed ${targetBedId} reserved successfully.`,
    reservation: result.reservation,
  });
}

/**
 * GET /reservations (bonus endpoint)
 * Return all active reservations.
 */
function getReservations(req, res) {
  return res.json({ reservations: getAllReservations() });
}

/**
 * DELETE /reservations/:id
 * Manually cancel a reservation.
 */
function deleteReservation(req, res) {
  const { id } = req.params;
  const result = cancelReservation(id);
  if (!result.success) {
    return res.status(404).json({ error: result.error });
  }

  const io = req.app.get('io');
  if (io) {
    io.emit('beds_updated', { stats: getBedStats(), beds: getAllBeds() });
    io.emit('reservations_updated', { reservations: getAllReservations() });
  }

  return res.json({ message: `Reservation ${id} cancelled.` });
}

module.exports = { reserveBed, getReservations, deleteReservation };
