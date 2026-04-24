import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Activity, Shield, Users, Clock } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[#050505]">
      {/* Background Grid Accent */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="z-10 text-center max-w-4xl px-6"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 text-emerald-500 text-[10px] font-bold mb-8 tracking-widest uppercase">
          <Activity size={14} className="animate-pulse" />
          Mission Critical ER Response
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-[#E4E3E0] mb-6 uppercase">
          PRIORITY<br />
          <span className="text-emerald-500">ENGINE</span>
        </h1>
        
        <p className="text-sm text-zinc-500 mb-10 max-w-lg mx-auto font-mono uppercase tracking-tight leading-relaxed">
          High-density triage coordination system. Systematic patient prioritization for next-gen emergency facilities.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            id="launch-dashboard-btn"
            onClick={() => navigate('/dashboard')}
            className="px-10 py-4 bg-emerald-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-emerald-500 transition-all active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
          >
            Initialize Dashboard
          </button>
          <button onClick={() => navigate('/protocol')} className="px-10 py-4 bg-zinc-950 text-zinc-500 font-bold text-xs uppercase tracking-widest border border-zinc-800 hover:bg-zinc-900 transition-all">
            System Protocol
          </button>
        </div>

        <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-12 opacity-20">
          {['Secure', 'Live Sync', 'Triage', 'Real-time'].map((label, i) => (
            <div key={i} className="flex flex-col items-center gap-3">
              <div className="w-10 h-[1px] bg-zinc-500" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold">{label}</span>
            </div>
          ))}
        </div>
      </motion.div>
      
      {/* Visual Accents */}
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-emerald-600/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-emerald-600/5 blur-[120px] rounded-full" />
    </div>
  );
}

