import React from 'react';
import { useER } from '../context/ERContext';
import { motion, AnimatePresence } from 'motion/react';
import { MoreHorizontal, AlertTriangle, User, Bed, Clock } from 'lucide-react';

export default function PatientTable() {
  const { patients } = useER();

  const getSeverityColor = (score: number) => {
    if (score >= 8) return 'text-red-500 border-red-600';
    if (score >= 5) return 'text-yellow-500 border-yellow-600';
    return 'text-emerald-500 border-emerald-600';
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="grid grid-cols-7 border-b border-medical-border bg-zinc-950 px-6 py-3 text-[10px] font-bold uppercase text-zinc-500 tracking-tighter shrink-0">
        <div className="col-span-2">Patient Identity</div>
        <div>Severity</div>
        <div>Priority</div>
        <div>Wait Time</div>
        <div>Bed ID</div>
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
              const sevColor = getSeverityColor(patient.severity);
              const statusColor = patient.status === 'Assigned' ? 'text-emerald-400' : 'text-zinc-500';

              return (
                <motion.div 
                  layout
                  key={patient.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`grid grid-cols-7 px-6 py-4 items-center group hover:bg-zinc-900/50 transition-colors border-l-2 ${sevColor}`}
                >
                  <div className="col-span-2">
                    <div className="text-sm font-bold uppercase tracking-tight flex items-center gap-2">
                      {patient.name}
                      {patient.status === 'Waiting' && patient.priorityScore > 80 && (
                        <div className="w-1 h-1 rounded-full bg-red-600 animate-pulse" />
                      )}
                    </div>
                    <div className="text-[9px] font-mono opacity-40 uppercase">
                      ID: {patient.id} • {patient.arrivalType}
                    </div>
                  </div>
                  
                  <div className={`font-mono text-sm ${sevColor.split(' ')[0]}`}>
                    {patient.severity}/10
                  </div>
                  
                  <div className="font-mono text-sm tracking-tighter">
                    {patient.priorityScore.toFixed(1)}
                  </div>
                  
                  <div className="font-mono text-sm opacity-60">
                    {patient.waitTime}M
                  </div>
                  
                  <div className="font-mono text-sm flex items-center gap-1">
                    {patient.bedId ? (
                      <>
                        <Bed size={12} className="text-zinc-600" />
                        {patient.bedId}
                      </>
                    ) : (
                      <span className="opacity-20">—</span>
                    )}
                  </div>
                  
                  <div className={`text-right text-[10px] font-bold uppercase ${statusColor}`}>
                    {patient.status}
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

