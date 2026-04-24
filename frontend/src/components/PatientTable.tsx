import React, { useEffect, useState } from 'react';
import { useER } from '../context/ERContext';
import { Patient } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Bed, Stethoscope, Clock, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const CRITICAL_THRESHOLD = 7;
const CRITICAL_WAIT_MS   = 30_000;   // 30s
const STABLE_WAIT_MS     = 60_000;   // 60s

// ─── Helper: time remaining until escalation ─────────────────────────────────
function getEscalationMs(patient: Patient): number | null {
  if (patient.status !== 'waiting') return null;
  const limit = patient.severity >= CRITICAL_THRESHOLD ? CRITICAL_WAIT_MS : STABLE_WAIT_MS;
  const arrivedMs = patient.arrivedAtMs ?? (patient.arrivalTime ? new Date(patient.arrivalTime).getTime() : Date.now());
  return Math.max(0, arrivedMs + limit - Date.now());
}

// ─── Per-row countdown component ─────────────────────────────────────────────
function EscalationCountdown({ patient }: { patient: Patient }) {
  const [msLeft, setMsLeft] = useState<number | null>(() => getEscalationMs(patient));

  useEffect(() => {
    if (patient.status !== 'waiting') { setMsLeft(null); return; }

    const tick = () => setMsLeft(getEscalationMs(patient));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [patient.status, patient.arrivedAtMs, patient.arrivalTime, patient.severity]);

  if (msLeft === null) return null;

  const totalMs = patient.severity >= CRITICAL_THRESHOLD ? CRITICAL_WAIT_MS : STABLE_WAIT_MS;
  const pct     = Math.max(0, msLeft / totalMs);
  const mins    = Math.floor(msLeft / 60_000);
  const secs    = Math.floor((msLeft % 60_000) / 1000);
  const isCrit  = patient.severity >= CRITICAL_THRESHOLD;
  const isUrgent = pct < 0.25;

  return (
    <div className="flex flex-col gap-1 min-w-[72px]">
      <span className={`text-[9px] font-mono uppercase tracking-widest ${isCrit ? 'text-red-500' : 'text-yellow-500'} ${isUrgent ? 'animate-pulse' : ''}`}>
        {isCrit ? '→ Bed' : '→ Doctor'} {mins}:{secs.toString().padStart(2, '0')}
      </span>
      <div className="h-[2px] w-full bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isCrit ? 'bg-red-500' : 'bg-yellow-500'} ${isUrgent ? 'animate-pulse' : ''}`}
          style={{ width: `${(1 - pct) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ patient }: { patient: Patient }) {
  switch (patient.status) {
    case 'waiting':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-zinc-400">
          <Clock size={10} className="animate-spin" style={{ animationDuration: '3s' }} />
          Waiting
        </span>
      );
    case 'assigned':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-400">
          <Bed size={10} />
          Assigned
        </span>
      );
    case 'with_doctor':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-blue-400">
          <Stethoscope size={10} />
          With Doctor
        </span>
      );
    case 'treated':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-zinc-600">
          <CheckCircle2 size={10} />
          Treated
        </span>
      );
    default:
      return <span className="text-[10px] text-zinc-600 uppercase font-bold">{patient.status}</span>;
  }
}

function sevColor(s: number) {
  if (s >= 8) return 'text-red-500 border-red-600';
  if (s >= 5) return 'text-yellow-500 border-yellow-600';
  return 'text-emerald-500 border-emerald-600';
}

export default function PatientTable() {
  const { patients, doctors, updatePatient } = useER();

  const handleCallSurgeon = (patientId: string) => {
    const surgeon = doctors.find(d => d.specialization === 'Surgeon');
    if (surgeon) {
      updatePatient(patientId, { assignedDoctorId: surgeon.id });
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="grid grid-cols-10 border-b border-medical-border bg-zinc-950 px-6 py-3 text-[10px] font-bold uppercase text-zinc-500 tracking-tighter shrink-0">
        <div className="col-span-2">Patient Identity</div>
        <div>Severity</div>
        <div>Priority</div>
        <div>Wait</div>
        <div>Bed / Ward</div>
        <div className="col-span-2">Assigned Doctor</div>
        <div>Escalation</div>
        <div className="text-right">Status</div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-[#222]">
        <AnimatePresence mode="popLayout">
          {patients.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-zinc-600 italic text-sm font-mono uppercase tracking-widest">
              {'>'} Queue Empty / Systematic Idle
            </div>
          ) : (
            patients.map((patient) => {
              const sc = sevColor(patient.severity);
              const transfer = (patient as any).transferInfo;
              const doctor = doctors.find(d => d.id === patient.assignedDoctorId);
              const isAccident = patient.symptoms?.toLowerCase().includes('accident');
              const canCallSurgeon = isAccident && patient.severity >= 7 && doctor?.specialization !== 'Surgeon';

              return (
                <motion.div
                  layout
                  key={patient.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className={`grid grid-cols-10 px-6 py-4 items-center group hover:bg-zinc-900/50 transition-colors border-l-2 ${sc}`}
                >
                  <div className="col-span-2">
                    <div className="text-sm font-bold uppercase tracking-tight flex items-center gap-2">
                      {patient.name}
                      {patient.status === 'waiting' && patient.severity >= CRITICAL_THRESHOLD && (
                        <AlertTriangle size={10} className="text-red-500 animate-pulse" />
                      )}
                    </div>
                    <div className="text-[9px] font-mono opacity-40 uppercase">
                      {patient.id.slice(0, 8)} • {patient.arrivalType} • {patient.department}
                    </div>
                  </div>

                  <div className={`font-mono text-sm ${sc.split(' ')[0]}`}>
                    {patient.severity}/10
                  </div>

                  <div className="font-mono text-sm tracking-tighter">
                    {typeof patient.priorityScore === 'number' ? patient.priorityScore.toFixed(2) : '—'}
                  </div>

                  <div className="font-mono text-sm opacity-60">
                    {patient.waitTime}m
                  </div>

                  <div className="font-mono text-sm">
                    {patient.bedId ? (
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1">
                          <Bed size={12} className="text-zinc-600" />
                          {patient.bedId}
                        </span>
                        {transfer && (
                          <span className="text-[8px] text-orange-500 flex items-center gap-0.5 mt-0.5">
                            ({transfer.fromWard}) <ArrowRight size={8} /> ({transfer.toWard}) | R{transfer.originalRoom}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="opacity-20">—</span>
                    )}
                  </div>

                  <div className="col-span-2">
                    {doctor ? (
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-zinc-300 flex items-center gap-1">
                          <Stethoscope size={10} className="text-blue-500" />
                          {doctor.name}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-500 uppercase">{doctor.specialization}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-zinc-700 italic">No doctor assigned</span>
                    )}
                    {canCallSurgeon && (
                      <button
                        onClick={() => handleCallSurgeon(patient.id)}
                        className="mt-1 bg-red-950/30 border border-red-700/50 hover:bg-red-900/50 text-red-500 text-[8px] font-bold uppercase px-2 py-0.5 rounded transition-colors flex items-center gap-1 animate-pulse"
                      >
                        Call Surgeon
                      </button>
                    )}
                  </div>

                  <div>
                    <EscalationCountdown patient={patient} />
                  </div>

                  <div className="text-right">
                    <StatusBadge patient={patient} />
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}


