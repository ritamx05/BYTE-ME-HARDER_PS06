import React, { useState, useEffect } from 'react';
import { useER } from '../context/ERContext';
import { Bed, ShieldAlert, Timer, Users, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function BedManagement() {
  const { beds, reservations, assignBed, reserveBed } = useER();
  const [showError, setShowError] = useState(false);

  const handleAssign = async () => {
    if (beds.available <= 0) {
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
      return;
    }
    await assignBed();
  };

  return (
    <section className="space-y-4">
      <h2 className="text-xs font-bold uppercase text-zinc-500 tracking-widest">Bed Management</h2>
      <div className="space-y-3">
        <button 
          id="assign-btn"
          onClick={handleAssign}
          className="w-full border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <Users size={14} />
          Assign Next Bed
        </button>
        
        <button 
          id="reserve-btn"
          onClick={reserveBed}
          className="w-full border border-orange-900/30 bg-orange-900/10 hover:bg-orange-900/20 text-orange-400 font-bold py-3 text-xs uppercase tracking-widest transition-all flex justify-between px-4 active:scale-95"
        >
          <span>Reserve for Ambulance</span>
          <AnimatePresence>
            {reservations.length > 0 && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-mono"
              >
                <Countdown expiresAt={reservations[reservations.length - 1].expiresAt} />
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <AnimatePresence>
          {reservations.length > 1 && (
            <div className="mt-2 space-y-1">
              {reservations.slice(0, -1).map(res => (
                <div key={res.id} className="flex justify-between items-center text-[9px] font-mono text-orange-500/60 uppercase px-4">
                  <span>RES-{res.id.slice(0,3)}</span>
                  <Countdown expiresAt={res.expiresAt} />
                </div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Error Toast Simulation */}
      <AnimatePresence>
        {showError && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="text-[10px] font-mono text-red-500 mt-2"
          >
            {'>'} ERROR: BEDS_EXHAUSTED / OPERATION_ABORTED
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}


function Countdown({ expiresAt }: { expiresAt: number }) {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)));

  useEffect(() => {
    const timer = setInterval(() => {
      const newTime = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(newTime);
      if (newTime <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return <span>{mins}:{secs.toString().padStart(2, '0')}</span>;
}
