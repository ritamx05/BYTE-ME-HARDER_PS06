/**
 * bedController.js
 * Handles HTTP request/response logic for bed operations.
 */

const {
  getAllBeds,
  findAvailableBed,
  assignBed,
  getBedStats,
} = require('../services/bedService');
const { patientHeap } = require('../services/queueService');
const { getSystemMode } = require('../services/systemState');

/**
 * GET /beds
 * Return all bed states and summary stats.
 */
function getBeds(req, res) {
  return res.json({
    stats: getBedStats(),
    beds: getAllBeds(),
  });
}

/**
 * POST /assign-bed
 * Assign the highest priority waiting patient to an available bed.
 */
function assignNextBed(req, res) {
  // Find highest priority waiting patient
  const sorted = patientHeap.getSortedQueue();
  const nextPatient = sorted.find((p) => p.status === 'waiting');

  if (!nextPatient) {
    return res.status(400).json({ error: 'No waiting patients in the queue.' });
  }

  const bed = findAvailableBed();
  if (!bed) {
    return res.status(400).json({ error: 'No available beds. All beds are occupied or reserved.' });
  }

  const result = assignBed(bed.id, nextPatient.id);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  // Update patient status in heap
  const updated = patientHeap.updatePatient(nextPatient.id, {
    status: 'assigned',
    bedId: bed.id,
  });

  if (!updated) {
    return res.status(500).json({ error: 'Failed to update patient in queue.' });
  }

  console.log(`[ASSIGN] Patient "${nextPatient.name}" assigned to bed ${bed.id}`);

  const io = req.app.get('io');
  if (io) {
    io.emit('queue_updated', {
      queue: patientHeap.getSortedQueue(),
      mode: getSystemMode(),
    });
    io.emit('beds_updated', {
      stats: getBedStats(),
      beds: getAllBeds(),
    });
  }

  return res.json({
    message: `Patient "${nextPatient.name}" assigned to bed ${bed.id}.`,
    patient: { ...nextPatient, status: 'assigned', bedId: bed.id },
    bed: result.bed,
  });
}

module.exports = { getBeds, assignNextBed };
