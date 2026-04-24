/**
 * bedController.js
 * Handles HTTP request/response logic for bed operations.
 */

const {
  getAllBeds,
  findAvailableBed,
  findAnyAvailableBed,
  assignBed,
  getBedStats,
  getRoomLayout,
} = require('../services/bedService');
const { patientHeap } = require('../services/queueService');

/**
 * GET /beds
 */
function getBeds(req, res) {
  return res.json({
    stats: getBedStats(),
    beds: getAllBeds(),
    rooms: getRoomLayout()
  });
}

/**
 * POST /assign-bed
 */
function assignNextBed(req, res) {
  const sorted = patientHeap.getSortedQueue();
  const nextPatient = sorted.find((p) => p.status === 'waiting');

  if (!nextPatient) {
    return res.status(400).json({ error: 'No waiting patients.' });
  }

  // Try preferred ward
  let bed = findAvailableBed(nextPatient.department);
  let targetWard = nextPatient.department;

  // PREEMPTION: If severe and no bed in ward, take ANY bed
  if (!bed && nextPatient.severity >= 7) {
    bed = findAnyAvailableBed();
  }

  if (!bed) {
    return res.status(400).json({ error: 'No available beds found.' });
  }

  const result = assignBed(bed.id, nextPatient.id, targetWard);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  patientHeap.updatePatient(nextPatient.id, {
    status: 'assigned',
    bedId: bed.id,
    transferInfo: bed.transferInfo
  });

  const io = req.app.get('io');
  if (io) {
    io.emit('update_queue', patientHeap.getSortedQueue());
    io.emit('update_beds', getBedStats());
    io.emit('rooms_updated', getRoomLayout());
  }

  return res.json({
    message: `Patient "${nextPatient.name}" assigned to bed ${bed.id}.`,
    patient: { ...nextPatient, status: 'assigned', bedId: bed.id, transferInfo: bed.transferInfo },
    bed: result.bed,
  });
}

module.exports = { getBeds, assignNextBed };

