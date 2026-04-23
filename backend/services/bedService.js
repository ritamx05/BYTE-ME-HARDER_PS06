/**
 * bedService.js
 * Manages bed state: assignment, release, and reservation enforcement.
 */

require('dotenv').config();

const TOTAL_BEDS = parseInt(process.env.TOTAL_BEDS, 10) || 10;

// Initialize beds
const beds = Array.from({ length: TOTAL_BEDS }, (_, i) => ({
  id: `BED-${String(i + 1).padStart(2, '0')}`,
  isOccupied: false,
  isReserved: false,
  patientId: null,
}));

/**
 * Get all beds.
 * @returns {Object[]}
 */
function getAllBeds() {
  return [...beds];
}

/**
 * Get a bed by id.
 * @param {string} bedId
 * @returns {Object|null}
 */
function getBedById(bedId) {
  return beds.find((b) => b.id === bedId) || null;
}

/**
 * Find the first available (not occupied, not reserved) bed.
 * @returns {Object|null}
 */
function findAvailableBed() {
  return beds.find((b) => !b.isOccupied && !b.isReserved) || null;
}

/**
 * Assign a specific bed to a patient.
 * Enforces no overbooking and reserved bed rules.
 * @param {string} bedId
 * @param {string} patientId
 * @returns {{ success: boolean, error?: string }}
 */
function assignBed(bedId, patientId) {
  const bed = getBedById(bedId);
  if (!bed) return { success: false, error: `Bed ${bedId} not found.` };
  if (bed.isOccupied) return { success: false, error: `Bed ${bedId} is already occupied.` };
  if (bed.isReserved) return { success: false, error: `Bed ${bedId} is reserved and cannot be assigned.` };

  bed.isOccupied = true;
  bed.patientId = patientId;
  console.log(`[BED] Bed ${bedId} assigned to patient ${patientId}`);
  return { success: true, bed };
}

/**
 * Reserve a specific bed (for ambulance incoming).
 * @param {string} bedId
 * @returns {{ success: boolean, error?: string }}
 */
function reserveBed(bedId) {
  const bed = getBedById(bedId);
  if (!bed) return { success: false, error: `Bed ${bedId} not found.` };
  if (bed.isOccupied) return { success: false, error: `Bed ${bedId} is occupied.` };
  if (bed.isReserved) return { success: false, error: `Bed ${bedId} is already reserved.` };

  bed.isReserved = true;
  console.log(`[BED] Bed ${bedId} reserved for ambulance`);
  return { success: true, bed };
}

/**
 * Release a reservation on a bed (expiry or cancellation).
 * @param {string} bedId
 * @returns {{ success: boolean, error?: string }}
 */
function releaseBedReservation(bedId) {
  const bed = getBedById(bedId);
  if (!bed) return { success: false, error: `Bed ${bedId} not found.` };

  bed.isReserved = false;
  console.log(`[BED] Reservation released on bed ${bedId}`);
  return { success: true, bed };
}

/**
 * Release (free) a bed after patient is treated or discharged.
 * @param {string} bedId
 * @returns {{ success: boolean, error?: string }}
 */
function releaseBed(bedId) {
  const bed = getBedById(bedId);
  if (!bed) return { success: false, error: `Bed ${bedId} not found.` };

  bed.isOccupied = false;
  bed.isReserved = false;
  bed.patientId = null;
  console.log(`[BED] Bed ${bedId} released`);
  return { success: true, bed };
}

/**
 * Summarize bed availability counts.
 * @returns {{ total, available, occupied, reserved }}
 */
function getBedStats() {
  const occupied = beds.filter((b) => b.isOccupied).length;
  const reserved = beds.filter((b) => b.isReserved).length;
  const available = beds.filter((b) => !b.isOccupied && !b.isReserved).length;
  return { total: TOTAL_BEDS, available, occupied, reserved };
}

module.exports = {
  getAllBeds,
  getBedById,
  findAvailableBed,
  assignBed,
  reserveBed,
  releaseBed,
  releaseBedReservation,
  getBedStats,
};
