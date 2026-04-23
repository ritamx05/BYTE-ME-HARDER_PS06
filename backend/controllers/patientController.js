/**
 * patientController.js
 * Handles HTTP request/response logic for patient operations.
 */

const { v4: uuidv4 } = require('uuid');
const { patientHeap } = require('../services/queueService');
const { calculatePriority } = require('../services/priorityService');
const { getSystemMode } = require('../services/systemState');

/**
 * POST /patients
 * Add a new patient to the queue.
 */
function addPatient(req, res) {
  const { name, severity, isAmbulance } = req.body;

  // Validate input
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Patient name is required.' });
  }
  const sev = parseInt(severity, 10);
  if (isNaN(sev) || sev < 1 || sev > 10) {
    return res.status(400).json({ error: 'Severity must be a number between 1 and 10.' });
  }

  const isMCI = getSystemMode() === 'MCI';

  const newPatient = {
    id: uuidv4(),
    name: name.trim(),
    severity: sev,
    arrivalTime: new Date().toISOString(),
    arrivedAtMs: Date.now(),
    waitTime: 0,
    priorityScore: 0,
    survivalProbability: 0,
    status: 'waiting',
    bedId: null,
    isAmbulance: Boolean(isAmbulance),
  };

  const { priorityScore, survivalProbability } = calculatePriority(newPatient, isMCI);
  newPatient.priorityScore = priorityScore;
  newPatient.survivalProbability = survivalProbability;

  patientHeap.insertPatient(newPatient);

  console.log(
    `[PATIENT] Added: ${newPatient.name} | Severity: ${newPatient.severity} | Score: ${newPatient.priorityScore} | Mode: ${getSystemMode()}`
  );

  // Broadcast via socket if available
  if (req.app.get('io')) {
    req.app.get('io').emit('queue_updated', {
      queue: patientHeap.getSortedQueue(),
      mode: getSystemMode(),
    });
  }

  return res.status(201).json({ message: 'Patient added successfully.', patient: newPatient });
}

/**
 * GET /patients
 * Return the full sorted priority queue.
 */
function getPatients(req, res) {
  const queue = patientHeap.getSortedQueue();
  return res.json({ mode: getSystemMode(), count: queue.length, queue });
}

module.exports = { addPatient, getPatients };
