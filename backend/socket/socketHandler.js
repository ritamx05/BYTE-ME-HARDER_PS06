/**
 * socketHandler.js
 * Real-time Socket.io event handlers for the ER Priority Engine.
 */

const { v4: uuidv4 } = require('uuid');
const { patientHeap } = require('../services/queueService');
const { calculatePriority } = require('../services/priorityService');
const { 
  findAvailableBed, 
  findAnyAvailableBed, 
  assignBed, 
  getBedStats, 
  getRoomLayout, 
  setupBeds, 
  getIsConfigured 
} = require('../services/bedService');
const { createReservation, getAllReservations } = require('../services/reservationService');
const { toggleSystemMode, getSystemMode } = require('../services/systemState');
const { getAllDoctors, addDoctor, removeDoctor } = require('../services/doctorService');

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
    rooms: getRoomLayout(),
    doctors: getAllDoctors(),
    configured: getIsConfigured()
  });

  // ------------------------------------------------------------------
  // CONFIG: setup_config
  // ------------------------------------------------------------------
  socket.on('setup_config', (data) => {
    try {
      const success = setupBeds(data);
      if (success) {
        // Reset queue on new config as per Protocol requirements
        patientHeap.heap = [];
        patientHeap.rebuildHeap();
        
        io.emit('rooms_updated', getRoomLayout());
        io.emit('update_beds', getBedStats());
        io.emit('update_queue', []);
        socket.emit('config_saved', { success: true });
      }
    } catch (err) {
      socket.emit('error', { event: 'setup_config', message: err.message });
    }
  });

  // ------------------------------------------------------------------
  // DOCTORS: add_doctor / remove_doctor
  // ------------------------------------------------------------------
  socket.on('add_doctor', (data) => {
    addDoctor(data);
    io.emit('doctors_updated', getAllDoctors());
  });

  socket.on('remove_doctor', (data) => {
    removeDoctor(data.doctorId);
    io.emit('doctors_updated', getAllDoctors());
  });

  // ------------------------------------------------------------------
  // EVENT: add_patient
  // ------------------------------------------------------------------
  socket.on('add_patient', (data) => {
    try {
      const { name, severity, arrivalType, department, symptoms, assignedDoctorId } = data || {};

      const isMCI = getSystemMode() === 'MCI';
      const patient = {
        id: uuidv4(),
        name: name.trim(),
        severity: parseInt(severity, 10),
        department: department || 'ER',
        arrivalType: arrivalType || 'Walk-in',
        isAmbulance: arrivalType === 'Ambulance',
        symptoms: symptoms || '',
        assignedDoctorId: assignedDoctorId || null,
        arrivalTime: new Date().toISOString(),
        arrivedAtMs: Date.now(),
        waitTime: 0,
        priorityScore: 0,
        survivalProbability: 0,
        status: 'waiting',
        bedId: null,
      };

      const { priorityScore, survivalProbability } = calculatePriority(patient, isMCI);

      patient.priorityScore = priorityScore;
      patient.survivalProbability = survivalProbability;

      patientHeap.insertPatient(patient);
      io.emit('update_queue', patientHeap.getSortedQueue());
      socket.emit('patient_added', { success: true, patient });
    } catch (err) {
      socket.emit('error', { event: 'add_patient', message: err.message });
    }
  });

  // ------------------------------------------------------------------
  // EVENT: update_patient
  // ------------------------------------------------------------------
  socket.on('update_patient', (data) => {
    try {
      const { patientId, updates } = data || {};
      const success = patientHeap.updatePatient(patientId, updates);
      if (success) {
        io.emit('update_queue', patientHeap.getSortedQueue());
      }
    } catch (err) {
      socket.emit('error', { event: 'update_patient', message: err.message });
    }
  });


  // ------------------------------------------------------------------
  // EVENT: assign_bed
  // ------------------------------------------------------------------
  socket.on('assign_bed', () => {
    try {
      const sorted = patientHeap.getSortedQueue();
      const nextPatient = sorted.find((p) => p.status === 'waiting');

      if (!nextPatient) return;

      // Try preferred ward first
      let bed = findAvailableBed(nextPatient.department);
      let targetWard = nextPatient.department;

      // PREEMPTION: If severe and no bed in ward, take ANY bed
      if (!bed && nextPatient.severity >= 7) {
        bed = findAnyAvailableBed();
        targetWard = nextPatient.department; // Still assigning TO this department
      }

      if (!bed) return;

      const result = assignBed(bed.id, nextPatient.id, targetWard);
      if (result.success) {
        patientHeap.updatePatient(nextPatient.id, { 
          status: 'assigned', 
          bedId: bed.id,
          transferInfo: bed.transferInfo 
        });
        
        io.emit('update_queue', patientHeap.getSortedQueue());
        io.emit('update_beds', getBedStats());
        io.emit('rooms_updated', getRoomLayout());
      }
    } catch (err) {
      socket.emit('error', { event: 'assign_bed', message: err.message });
    }
  });

  // ------------------------------------------------------------------
  // EVENT: reserve_bed
  // ------------------------------------------------------------------
  socket.on('reserve_bed', (data) => {
    try {
      const { bedId: requestedBedId } = data || {};
      let bed = requestedBedId ? { id: requestedBedId } : findAvailableBed('ER');
      
      if (!bed) return;

      const result = createReservation(bed.id);
      if (result.success) {
        io.emit('update_beds', getBedStats());
        io.emit('rooms_updated', getRoomLayout());
        io.emit('update_reservations', getAllReservations());
      }
    } catch (err) {
      socket.emit('error', { event: 'reserve_bed', message: err.message });
    }
  });

  // ------------------------------------------------------------------
  // EVENT: toggle_mci
  // ------------------------------------------------------------------
  socket.on('toggle_mci', () => {
    const newMode = toggleSystemMode();
    const isMCI = newMode === 'MCI';

    patientHeap.heap.forEach(p => {
      const { priorityScore, survivalProbability } = calculatePriority(p, isMCI);
      p.priorityScore = priorityScore;
      p.survivalProbability = survivalProbability;
    });
    patientHeap.rebuildHeap();

    io.emit('update_mci', isMCI);
    io.emit('update_queue', patientHeap.getSortedQueue());
  });

  socket.on('disconnect', () => {
    console.log(`[SOCKET] Client disconnected: ${socket.id}`);
  });
}

module.exports = { registerSocketHandlers };

