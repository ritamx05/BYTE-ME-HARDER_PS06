import React, { useEffect, useState } from 'react';
import { useER } from '../context/ERContext';
import PatientTable from '../components/PatientTable';
import AddPatientForm from '../components/AddPatientForm';
import BedManagement from '../components/BedManagement';
import MCIToggle from '../components/MCIToggle';
import { LogOut, Bed, Stethoscope, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useVitalsDecay } from '../hooks/useVitalsDecay';
import { EscalationToast } from '../context/ERContext';

// ─── Live clock ───────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono tabular-nums text-zinc-400 text-xs">
      {time.toLocaleTimeString([], { hour12: false })}
    </span>
  );
}

// ─── Single toast card ────────────────────────────────────────────────────────
function ToastCard({ toast, onDismiss }: { toast: EscalationToast; onDismiss: () => void }) {
  const isBed = toast.action === 'bed_assigned';
  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60 }}
      className={`flex items-start gap-3 p-3 rounded-lg border text-xs shadow-xl w-72 ${
        isBed
          ? 'bg-emerald-950/80 border-emerald-700/40 text-emerald-300'
          : 'bg-blue-950/80 border-blue-700/40 text-blue-300'
      }`}
    >
      {isBed ? <Bed size={14} className="shrink-0 mt-0.5" /> : <Stethoscope size={14} className="shrink-0 mt-0.5" />}
      <div className="flex-1 min-w-0">
        <div className="font-bold uppercase tracking-widest text-[10px] mb-0.5">
          {isBed ? 'Bed Assigned' : 'Sent to Doctor'}
        </div>
        <div className="opacity-80 leading-tight">{toast.message}</div>
      </div>
      <button onClick={onDismiss} className="opacity-50 hover:opacity-100 shrink-0">
        <X size={12} />
      </button>
    </motion.div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { isConnected, mciMode, beds, toasts, dismissToast } = useER();
  const navigate = useNavigate();
  useVitalsDecay();

  return (
    <div className="min-h-screen bg-medical-bg flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-medical-border px-6 flex items-center justify-between bg-medical-card shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
          <h1 className="text-lg font-bold tracking-tight uppercase">
            ER PRIORITY ENGINE <span className="text-[10px] font-mono text-zinc-500 ml-2">v4.1.0</span>
          </h1>
        </div>

        <div className="flex items-center gap-8">
          {/* Live clock */}
          <LiveClock />

          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-[10px] uppercase text-zinc-500 mb-0.5">Total Beds</p>
              <p className="font-mono text-lg">{beds.total}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase text-zinc-500 mb-0.5">Available</p>
              <p className="font-mono text-lg text-emerald-400">{beds.available}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase text-zinc-500 mb-0.5">Reserved</p>
              <p className="font-mono text-lg text-orange-400">{beds.reserved}</p>
            </div>
          </div>

          <div className="h-10 w-[1px] bg-medical-border" />

          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        {/* Sidebar Controls */}
        <aside className="w-80 border-r border-medical-border bg-medical-card p-6 flex flex-col gap-8 overflow-y-auto">
          <MCIToggle />
          <div className="h-[1px] bg-medical-border" />
          <AddPatientForm />
          <div className="h-[1px] bg-medical-border" />
          <BedManagement />
        </aside>

        {/* Main Queue Dashboard */}
        <section className="flex-1 flex flex-col overflow-hidden">
          <PatientTable />

          {/* Footer Status */}
          <footer className="h-12 border-t border-medical-border px-6 flex items-center justify-between text-[10px] uppercase font-bold tracking-widest bg-medical-card shrink-0">
            <div className="flex gap-4">
              <span className="text-zinc-600">Engine: <span className="text-emerald-500">Running</span></span>
              <span className="text-zinc-600">Socket: <span className={isConnected ? 'text-emerald-500' : 'text-red-500'}>
                {isConnected ? 'Connected' : 'Offline'}
              </span></span>
              <span className="text-zinc-600">Mode: <span className={mciMode ? 'text-orange-400' : 'text-emerald-500'}>
                {mciMode ? 'MCI' : 'Normal'}
              </span></span>
            </div>
            <div className="text-zinc-600 flex items-center gap-2">
              Auto-Escalation: <span className="text-emerald-500">Active</span>
              <span className="text-zinc-700">| Crit: 1m | Stable: 2m</span>
            </div>
          </footer>
        </section>
      </main>

      {/* ── Toast Overlay (bottom-right) ─────────────────────── */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <div key={t.id} className="pointer-events-auto">
              <ToastCard toast={t} onDismiss={() => dismissToast(t.id)} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
