import React from 'react';
import { useER } from '../context/ERContext';
import { motion } from 'motion/react';
import { AlertTriangle, Info } from 'lucide-react';

export default function MCIToggle() {
  const { mciMode, toggleMCI } = useER();

  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">MCI Mode</span>
      <button 
        id="mci-toggle" 
        onClick={() => toggleMCI(!mciMode)}
        className={`w-12 h-6 rounded-full relative transition-colors border ${mciMode ? 'bg-orange-600 border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.3)]' : 'bg-zinc-800 border-zinc-700'}`}
      >
        <motion.div 
          layout
          className={`absolute top-1 w-4 h-4 rounded-full transition-all ${mciMode ? 'bg-white' : 'bg-zinc-500'}`}
          animate={{ left: mciMode ? '1.5rem' : '0.25rem' }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}

