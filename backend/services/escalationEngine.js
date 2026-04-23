/**
 * escalationEngine.js
 * Real-time patient escalation engine.
 *
 * Rules:
 *   Severity 7–10 (CRITICAL) → auto-assign to bed after 1 minute of waiting
 *   Severity 1–6  (STABLE)   → send to doctor after 2 minutes of waiting
 *
 * Runs every second to give the frontend an accurate real-time countdown.
 * Broadcasts:
 *   - update_queue  : full sorted patient list after any escalation
 *   - update_beds   : bed stats after bed assignment
 *   - patient_escalated : { patient, action }  for toast notifications
 */

const { patientHeap } = require('./queueService');
const { findAvailableBed, assignBed, getBedStats } = require('./bedService');
const { getSystemMode } = require('./systemState');

const CRITICAL_THRESHOLD = 7;         // severity >= this → bed assignment
const CRITICAL_WAIT_MS   = 60_000;    // 1 minute
const STABLE_WAIT_MS     = 120_000;   // 2 minutes

let _io = null;

function setIO(io) {
  _io = io;
}

/**
 * Check every patient in the heap and escalate if their wait has elapsed.
 */
function escalationTick() {
  const now = Date.now();
  let changed = false;

  for (let i = 0; i < patientHeap.heap.length; i++) {
    const p = patientHeap.heap[i];

    // Only act on patients who are still waiting
    if (p.status !== 'waiting') continue;

    const elapsedMs = now - p.arrivedAtMs;   // arrivedAtMs set on insert

    if (p.severity >= CRITICAL_THRESHOLD) {
      // CRITICAL: assign bed after 1 min
      if (elapsedMs >= CRITICAL_WAIT_MS) {
        const bed = findAvailableBed();
        if (bed) {
          const result = assignBed(bed.id, p.id);
          if (result.success) {
            p.status = 'assigned';
            p.bedId  = bed.id;
            changed  = true;
            console.log(`[ESCALATION] CRITICAL patient "${p.name}" auto-assigned to ${bed.id}`);
            _io && _io.emit('patient_escalated', {
              patient: { ...p },
              action: 'bed_assigned',
              message: `${p.name} (sev ${p.severity}) auto-assigned to ${bed.id}`,
            });
          }
        } else {
          // No beds — flag as with_doctor as fallback
          p.status = 'with_doctor';
          changed  = true;
          console.log(`[ESCALATION] CRITICAL patient "${p.name}" — no beds, routed to doctor`);
          _io && _io.emit('patient_escalated', {
            patient: { ...p },
            action: 'with_doctor',
            message: `${p.name} (sev ${p.severity}) routed to on-call doctor (no beds available)`,
          });
        }
      }
    } else {
      // STABLE: send to doctor after 2 min
      if (elapsedMs >= STABLE_WAIT_MS) {
        p.status = 'with_doctor';
        changed  = true;
        console.log(`[ESCALATION] STABLE patient "${p.name}" sent to doctor`);
        _io && _io.emit('patient_escalated', {
          patient: { ...p },
          action: 'with_doctor',
          message: `${p.name} (sev ${p.severity}) sent to on-call doctor`,
        });
      }
    }
  }

  if (changed) {
    patientHeap.rebuildHeap();
    _io && _io.emit('update_queue', patientHeap.getSortedQueue());
    _io && _io.emit('update_beds', getBedStats());
  }
}

function startEscalationEngine() {
  console.log('[ESCALATION] Engine started. Polling every 1s.');
  setInterval(escalationTick, 1000);
}

module.exports = { setIO, startEscalationEngine };
