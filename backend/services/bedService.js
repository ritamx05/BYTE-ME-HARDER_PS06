/**
 * bedService.js
 * Manages bed state across multiple wards (ER, OPD).
 * Supports dynamic configuration and cross-ward preemption (transfers).
 */

let beds = [];
let isConfigured = false;

/**
 * Initialize/Setup beds based on room configuration.
 * @param {Object} config - { ERRooms, ERBedsPerRoom, OPDRooms, OPDBedsPerRoom }
 */
function setupBeds(config) {
  const { ERRooms, ERBedsPerRoom, OPDRooms, OPDBedsPerRoom } = config;
  const newBeds = [];

  // Generate ER Beds
  for (let r = 1; r <= ERRooms; r++) {
    for (let b = 1; b <= ERBedsPerRoom; b++) {
      newBeds.push({
        id: `ER-R${r}-B${b}`,
        number: b,
        roomNumber: 100 + r,
        ward: 'ER',
        isOccupied: false,
        isReserved: false,
        patientId: null,
        transferInfo: null,
      });
    }
  }

  // Generate OPD Beds
  for (let r = 1; r <= OPDRooms; r++) {
    for (let b = 1; b <= OPDBedsPerRoom; b++) {
      newBeds.push({
        id: `OPD-R${r}-B${b}`,
        number: b,
        roomNumber: 200 + r,
        ward: 'OPD',
        isOccupied: false,
        isReserved: false,
        patientId: null,
        transferInfo: null,
      });
    }
  }

  beds = newBeds;
  isConfigured = true;
  console.log(`[BED] System configured with ${beds.length} beds (${ERTotal(config)} ER, ${OPDTotal(config)} OPD)`);
  return true;
}

const ERTotal = (c) => c.ERRooms * c.ERBedsPerRoom;
const OPDTotal = (c) => c.OPDRooms * c.OPDBedsPerRoom;

function getIsConfigured() {
  return isConfigured;
}

/**
 * Get all beds.
 */
function getAllBeds() {
  return [...beds];
}

/**
 * Get bed by ID.
 */
function getBedById(bedId) {
  return beds.find((b) => b.id === bedId) || null;
}

/**
 * Find an available bed in a specific ward.
 * @param {string} ward - 'ER' | 'OPD'
 */
function findAvailableBed(ward) {
  return beds.find((b) => b.ward === ward && !b.isOccupied && !b.isReserved) || null;
}

/**
 * Find ANY available bed in the whole system, regardless of ward.
 */
function findAnyAvailableBed() {
  return beds.find((b) => !b.isOccupied && !b.isReserved) || null;
}

/**
 * Assign a bed to a patient.
 */
function assignBed(bedId, patientId, targetWard = null) {
  const bed = getBedById(bedId);
  if (!bed) return { success: false, error: `Bed ${bedId} not found.` };
  if (bed.isOccupied) return { success: false, error: `Bed ${bedId} is already occupied.` };

  // If assigning to a different ward than original, mark as transferred
  if (targetWard && bed.ward !== targetWard) {
    bed.transferInfo = {
      fromWard: bed.ward,
      toWard: targetWard,
      originalRoom: bed.roomNumber,
      originalBed: bed.number,
    };
    console.log(`[BED] PREEMPTION: ${bed.id} taken from ${bed.ward} and given to ${targetWard}`);
  }

  bed.isOccupied = true;
  bed.patientId = patientId;
  return { success: true, bed };
}

/**
 * Reserve a bed.
 */
function reserveBed(bedId) {
  const bed = getBedById(bedId);
  if (!bed || bed.isOccupied || bed.isReserved) return { success: false };
  bed.isReserved = true;
  return { success: true, bed };
}

/**
 * Release a bed.
 */
function releaseBed(bedId) {
  const bed = getBedById(bedId);
  if (!bed) return { success: false };
  bed.isOccupied = false;
  bed.isReserved = false;
  bed.patientId = null;
  bed.transferInfo = null; // Reset transfer on release
  return { success: true, bed };
}

/**
 * Release a reservation.
 */
function releaseBedReservation(bedId) {
  const bed = getBedById(bedId);
  if (bed) bed.isReserved = false;
  return { success: true, bed };
}

/**
 * Get statistics.
 */
function getBedStats() {
  const total = beds.length;
  const occupied = beds.filter((b) => b.isOccupied).length;
  const reserved = beds.filter((b) => b.isReserved).length;
  const available = total - occupied - reserved;
  return { total, available, occupied, reserved };
}

/**
 * Get room layout (for Protocol Page).
 */
function getRoomLayout() {
  const layout = { ER: [], OPD: [] };
  const rooms = {};

  beds.forEach(bed => {
    const key = `${bed.ward}-${bed.roomNumber}`;
    if (!rooms[key]) {
      rooms[key] = { id: key, number: bed.roomNumber, ward: bed.ward, beds: [] };
      layout[bed.ward].push(rooms[key]);
    }
    rooms[key].beds.push({
      id: bed.id,
      number: bed.number,
      status: bed.isOccupied ? 'occupied' : (bed.isReserved ? 'reserved' : 'available'),
      patientId: bed.patientId,
      transferInfo: bed.transferInfo
    });
  });

  return layout;
}

// Run seed on load if not configured
function seedBeds() {
  if (isConfigured) return;
  setupBeds({
    ERRooms: 2,
    ERBedsPerRoom: 5,
    OPDRooms: 0,
    OPDBedsPerRoom: 0
  });
}

seedBeds();

module.exports = {
  setupBeds,
  getIsConfigured,
  getAllBeds,
  getBedById,
  findAvailableBed,
  findAnyAvailableBed,
  assignBed,
  reserveBed,
  releaseBed,
  releaseBedReservation,
  getBedStats,
  getRoomLayout,
  seedBeds,
};


