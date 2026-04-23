/**
 * socketHandler.js
 * Real-time Socket.io event handlers for the ER Priority Engine.
 *
 * Events handled:
 *  - add_patient
 *  - assign_bed
 *  - reserve_bed
 *  - toggle_mci
 *
 * Broadcasts:
 *  - queue_updated
 *  - beds_updated
 *  - reservations_updated
 *  - mode_changed
 *  - error
 */

const { v4: uuidv4 } = require('uuid');
const { patientHeap } = require('../services/queueService');
const { calculatePriority } = require('../services/priorityService');
const { findAvailableBed, assignBed, getAllBeds, getBedStats } = require('../services/bedService');
const { createReservation, getAllReservations } = require('../services/reservationService');
const { toggleSystemMode, getSystemMode } = require('../services/systemState');

/**
 * Register all socket event handlers.
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
function registerSocketHandlers(io, socket) {
  console.log(`[SOCKET] Client connected: ${socket.id}`);

  // Send initial state on connect
  socket.emit('initial_state', {
    patients: patientHeap.getSortedQueue(),
    beds: getBedStats(),
    reservations: getAllReservations(),
    mciMode: getSystemMode() === 'MCI',
  });

  // ------------------------------------------------------------------
  // EVENT: add_patient
  // Payload: { name, severity, isAmbulance? }
  // ------------------------------------------------------------------
  socket.on('add_patient', (data) => {
    try {
      const { name, severity, isAmbulance } = data || {};

      if (!name || typeof name !== 'string') {
        return socket.emit('error', { event: 'add_patient', message: 'Name is required.' });
      }
      const sev = parseInt(severity, 10);
      if (isNaN(sev) || sev < 1 || sev > 10) {
        return socket.emit('error', { event: 'add_patient', message: 'Severity must be 1–10.' });
      }

      const isMCI = getSystemMode() === 'MCI';
      const patient = {
        id: uuidv4(),
        name: name.trim(),
        severity: sev,
        arrivalTime: new Date().toISOString(),
        arrivedAtMs: Date.now(),          // ms epoch for escalation timer
        waitTime: 0,
        priorityScore: 0,
        survivalProbability: 0,
        status: 'waiting',
        bedId: null,
        isAmbulance: Boolean(isAmbulance),
      };

      const { priorityScore, survivalProbability } = calculatePriority(patient, isMCI);
      patient.priorityScore = priorityScore;
      patient.survivalProbability = survivalProbability;

      patientHeap.insertPatient(patient);
      console.log(`[SOCKET] Patient added: ${patient.name} | Score: ${patient.priorityScore}`);

      io.emit('update_queue', patientHeap.getSortedQueue());

      socket.emit('patient_added', { success: true, patient });
    } catch (err) {
      console.error('[SOCKET] add_patient error:', err.message);
      socket.emit('error', { event: 'add_patient', message: err.message });
    }
  });

  // ------------------------------------------------------------------
  // EVENT: assign_bed
  // No payload required — assigns the top-priority waiting patient.
  // ------------------------------------------------------------------
  socket.on('assign_bed', () => {
    try {
      const sorted = patientHeap.getSortedQueue();
      const nextPatient = sorted.find((p) => p.status === 'waiting');

      if (!nextPatient) {
        return socket.emit('error', { event: 'assign_bed', message: 'No waiting patients.' });
      }

      const bed = findAvailableBed();
      if (!bed) {
        return socket.emit('error', { event: 'assign_bed', message: 'No available beds.' });
      }

      const result = assignBed(bed.id, nextPatient.id);
      if (!result.success) {
        return socket.emit('error', { event: 'assign_bed', message: result.error });
      }

      patientHeap.updatePatient(nextPatient.id, { status: 'assigned', bedId: bed.id });
      console.log(`[SOCKET] Bed ${bed.id} assigned to "${nextPatient.name}"`);

      io.emit('update_queue', patientHeap.getSortedQueue());
      io.emit('update_beds', getBedStats());
      socket.emit('bed_assigned', {
        success: true,
        patient: { ...nextPatient, status: 'assigned', bedId: bed.id },
        bed: result.bed,
      });
    } catch (err) {
      console.error('[SOCKET] assign_bed error:', err.message);
      socket.emit('error', { event: 'assign_bed', message: err.message });
    }
  });

  // ------------------------------------------------------------------
  // EVENT: reserve_bed
  // Payload: { note?, bedId? }
  // ------------------------------------------------------------------
  socket.on('reserve_bed', (data) => {
    try {
      const { note, bedId: requestedBedId } = data || {};

      let targetBedId = requestedBedId;
      if (!targetBedId) {
        const bed = findAvailableBed();
        if (!bed) {
          return socket.emit('error', { event: 'reserve_bed', message: 'No available beds for reservation.' });
        }
        targetBedId = bed.id;
      }

      const result = createReservation(targetBedId, note || '');
      if (!result.success) {
        return socket.emit('error', { event: 'reserve_bed', message: result.error });
      }

      console.log(`[SOCKET] Reservation created: ${result.reservation.id} for bed ${targetBedId}`);

      io.emit('update_beds', getBedStats());
      io.emit('update_reservations', getAllReservations());
      socket.emit('reservation_created', { success: true, reservation: result.reservation });
    } catch (err) {
      console.error('[SOCKET] reserve_bed error:', err.message);
      socket.emit('error', { event: 'reserve_bed', message: err.message });
    }
  });

  // ------------------------------------------------------------------
  // EVENT: toggle_mci
  // No payload — flips system mode and recalculates all priorities.
  // ------------------------------------------------------------------
  socket.on('toggle_mci', () => {
    try {
      const newMode = toggleSystemMode();
      const isMCI = newMode === 'MCI';

      for (let i = 0; i < patientHeap.heap.length; i++) {
        const p = patientHeap.heap[i];
        const { priorityScore, survivalProbability } = calculatePriority(p, isMCI);
        p.priorityScore = priorityScore;
        p.survivalProbability = survivalProbability;
      }
      patientHeap.rebuildHeap();

      console.log(`[SOCKET] MCI toggled to "${newMode}". Recalculated ${patientHeap.size()} patients.`);

      io.emit('update_mci', isMCI);
      io.emit('update_queue', patientHeap.getSortedQueue());
    } catch (err) {
      console.error('[SOCKET] toggle_mci error:', err.message);
      socket.emit('error', { event: 'toggle_mci', message: err.message });
    }
  });

  // ------------------------------------------------------------------
  // Disconnect
  // ------------------------------------------------------------------
  socket.on('disconnect', (reason) => {
    console.log(`[SOCKET] Client disconnected: ${socket.id} (reason: ${reason})`);
  });
}

module.exports = { registerSocketHandlers };
