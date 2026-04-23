/**
 * reservationService.js
 * Ghost Reservation System for ambulance pre-reservations.
 * Handles creation, expiry, and cleanup of bed reservations.
 */

require('dotenv').config();

const { reserveBed, releaseBedReservation } = require('./bedService');
const { v4: uuidv4 } = require('uuid');

const RESERVATION_EXPIRY_MS =
  parseInt(process.env.RESERVATION_EXPIRY_MS, 10) || 120000; // 2 minutes default

// In-memory reservation store
let reservations = [];

// Socket.io instance (injected at startup)
let _io = null;

/**
 * Inject the Socket.io instance for broadcasting.
 * @param {import('socket.io').Server} io
 */
function setIO(io) {
  _io = io;
}

/**
 * Get all active reservations.
 * @returns {Object[]}
 */
function getAllReservations() {
  return [...reservations];
}

/**
 * Create a ghost reservation for an ambulance incoming.
 * @param {string} bedId - The bed to reserve
 * @param {string} [note] - Optional note (e.g., patient name/ETA)
 * @returns {{ success: boolean, reservation?: Object, error?: string }}
 */
function createReservation(bedId, note = '') {
  const bedResult = reserveBed(bedId);
  if (!bedResult.success) {
    return { success: false, error: bedResult.error };
  }

  const reservation = {
    id: uuidv4(),
    bedId,
    note,
    createdAt: Date.now(),
    expiresAt: Date.now() + RESERVATION_EXPIRY_MS,
  };

  reservations.push(reservation);
  console.log(`[RESERVATION] Created: ${reservation.id} for bed ${bedId}. Expires in ${RESERVATION_EXPIRY_MS / 1000}s`);

  // Schedule auto-expiry
  setTimeout(() => {
    _expireReservation(reservation.id);
  }, RESERVATION_EXPIRY_MS);

  return { success: true, reservation };
}

/**
 * Internally expire a reservation by id.
 * Releases the bed and removes from store.
 * @param {string} reservationId
 */
function _expireReservation(reservationId) {
  const idx = reservations.findIndex((r) => r.id === reservationId);
  if (idx === -1) return; // Already removed (e.g., manually cancelled)

  const reservation = reservations[idx];
  reservations.splice(idx, 1);

  releaseBedReservation(reservation.bedId);
  console.log(`[RESERVATION] Expired: ${reservationId} — bed ${reservation.bedId} released`);

  // Broadcast to all connected clients
  if (_io) {
    _io.emit('reservation_expired', {
      reservationId,
      bedId: reservation.bedId,
      reservations: getAllReservations(),
    });
  }
}

/**
 * Manually cancel a reservation (e.g., ambulance arrived).
 * @param {string} reservationId
 * @returns {{ success: boolean, error?: string }}
 */
function cancelReservation(reservationId) {
  const idx = reservations.findIndex((r) => r.id === reservationId);
  if (idx === -1) {
    return { success: false, error: `Reservation ${reservationId} not found.` };
  }

  const reservation = reservations[idx];
  reservations.splice(idx, 1);
  releaseBedReservation(reservation.bedId);
  console.log(`[RESERVATION] Cancelled: ${reservationId} — bed ${reservation.bedId} released`);

  return { success: true };
}

module.exports = {
  setIO,
  getAllReservations,
  createReservation,
  cancelReservation,
};
