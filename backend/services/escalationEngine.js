/**
 * escalationEngine.js
 * Real-time patient escalation engine with Bed Preemption.
 */

const { patientHeap } = require('./queueService');
const { findAvailableBed, findAnyAvailableBed, assignBed, getBedStats, getRoomLayout } = require('./bedService');

const CRITICAL_THRESHOLD = 7;
const CRITICAL_WAIT_MS   = 30_000;    // 30 seconds (Severe)
const STABLE_WAIT_MS     = 60_000;    // 60 seconds (Reduced)

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
    if (p.status !== 'waiting') continue;

    const elapsedMs = now - p.arrivedAtMs;

    if (p.severity >= CRITICAL_THRESHOLD) {
      // SEVERE/CRITICAL: assign bed after 30s
      if (elapsedMs >= CRITICAL_WAIT_MS) {
        // 1. Try preferred ward
        let bed = findAvailableBed(p.department);
        let targetWard = p.department;

        // 2. PREEMPTION: Try ANY available bed if severe and preferred ward is full
        if (!bed) {
          bed = findAnyAvailableBed();
          targetWard = p.department;
        }

        if (bed) {
          const result = assignBed(bed.id, p.id, targetWard);
          if (result.success) {
            p.status = 'assigned';
            p.bedId  = bed.id;
            p.transferInfo = bed.transferInfo;
            changed  = true;
            
            const msg = bed.transferInfo 
              ? `${p.name} (sev ${p.severity}) assigned PREEMPTED bed: (${bed.transferInfo.fromWard}) -> (${bed.transferInfo.toWard}) | Room ${bed.transferInfo.originalRoom} | Bed ${bed.transferInfo.originalBed}`
              : `${p.name} (sev ${p.severity}) auto-assigned to ${bed.id}`;

            _io && _io.emit('patient_escalated', {
              patient: { ...p },
              action: 'bed_assigned',
              message: msg,
            });
          }
        } else {
          // No beds at all — fallback to doctor
          p.status = 'with_doctor';
          changed  = true;
          _io && _io.emit('patient_escalated', {
            patient: { ...p },
            action: 'with_doctor',
            message: `${p.name} (sev ${p.severity}) routed to doctor (NO BEDS AVAILABLE SYSTEM-WIDE)`,
          });
        }
      }
    } else {
      // STABLE: send to doctor after 60s
      if (elapsedMs >= STABLE_WAIT_MS) {
        p.status = 'with_doctor';
        changed  = true;
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
    _io && _io.emit('rooms_updated', getRoomLayout());
  }
}

function startEscalationEngine() {
  console.log(`[ESCALATION] Engine started. Crit: ${CRITICAL_WAIT_MS/1000}s, Stable: ${STABLE_WAIT_MS/1000}s`);
  setInterval(escalationTick, 1000);
}

module.exports = { setIO, startEscalationEngine };

