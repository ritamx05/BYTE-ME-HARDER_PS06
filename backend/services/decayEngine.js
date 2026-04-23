/**
 * decayEngine.js
 * Vitals Decay Engine — runs on a fixed interval to:
 *  1. Increase waitTime for all "waiting" patients
 *  2. Recalculate priorityScore
 *  3. Rebuild the max-heap
 *  4. Broadcast updated queue via Socket.io
 */

require('dotenv').config();

const { patientHeap } = require('./queueService');
const { calculatePriority } = require('./priorityService');
const { getSystemMode } = require('./systemState');

const VITALS_DECAY_INTERVAL_MS =
  parseInt(process.env.VITALS_DECAY_INTERVAL_MS, 10) || 60000;

let _io = null;

/**
 * Inject Socket.io instance.
 * @param {import('socket.io').Server} io
 */
function setIO(io) {
  _io = io;
}

/**
 * Perform one decay tick:
 * - Increments waitTime by 1 for all "waiting" patients
 * - Recalculates their priorityScore
 * - Rebuilds the heap
 * - Broadcasts updated queue
 */
function decayTick() {
  const isMCI = getSystemMode() === 'MCI';

  for (let i = 0; i < patientHeap.heap.length; i++) {
    const patient = patientHeap.heap[i];
    if (patient.status === 'waiting') {
      patient.waitTime += 1;
      const { priorityScore, survivalProbability } = calculatePriority(patient, isMCI);
      patient.priorityScore = priorityScore;
      patient.survivalProbability = survivalProbability;
    }
  }

  patientHeap.rebuildHeap();
  console.log(`[DECAY] Vitals decay tick — queue rebuilt. ${patientHeap.size()} patient(s) in queue.`);

  if (_io) {
    _io.emit('queue_updated', {
      queue: patientHeap.getSortedQueue(),
      mode: getSystemMode(),
    });
  }
}

/**
 * Start the decay engine interval.
 */
function startDecayEngine() {
  console.log(`[DECAY] Engine started. Interval: ${VITALS_DECAY_INTERVAL_MS / 1000}s`);
  setInterval(decayTick, VITALS_DECAY_INTERVAL_MS);
}

module.exports = { setIO, startDecayEngine };
