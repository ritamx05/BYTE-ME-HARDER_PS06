/**
 * mciController.js
 * Handles HTTP request/response logic for toggling MCI (Mass Casualty Incident) mode.
 */

const { patientHeap } = require('../services/queueService');
const { calculatePriority } = require('../services/priorityService');
const { toggleSystemMode, getSystemMode } = require('../services/systemState');

/**
 * POST /toggle-mci
 * Toggle the system between normal and MCI mode.
 * Recalculates all patient priorities after toggling.
 */
function toggleMCI(req, res) {
  const newMode = toggleSystemMode();
  const isMCI = newMode === 'MCI';

  // Recalculate priorities for all patients in heap
  for (let i = 0; i < patientHeap.heap.length; i++) {
    const patient = patientHeap.heap[i];
    const { priorityScore, survivalProbability } = calculatePriority(patient, isMCI);
    patient.priorityScore = priorityScore;
    patient.survivalProbability = survivalProbability;
  }

  // Rebuild heap with new scores
  patientHeap.rebuildHeap();

  console.log(`[MCI] Mode toggled to "${newMode}". Recalculated ${patientHeap.size()} patient(s).`);

  const io = req.app.get('io');
  if (io) {
    io.emit('mode_changed', { mode: newMode });
    io.emit('queue_updated', {
      queue: patientHeap.getSortedQueue(),
      mode: newMode,
    });
  }

  return res.json({
    message: `System mode switched to "${newMode}".`,
    mode: newMode,
    queue: patientHeap.getSortedQueue(),
  });
}

/**
 * GET /mode (bonus)
 * Return current system mode.
 */
function getMode(req, res) {
  return res.json({ mode: getSystemMode() });
}

module.exports = { toggleMCI, getMode };
