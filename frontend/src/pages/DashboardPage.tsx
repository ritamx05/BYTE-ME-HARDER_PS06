import React from 'react';
import { useER } from '../context/ERContext';
import PatientTable from '../components/PatientTable';
import AddPatientForm from '../components/AddPatientForm';
import BedManagement from '../components/BedManagement';
import MCIToggle from '../components/MCIToggle';
import { Activity, Bell, Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

import { useVitalsDecay } from '../hooks/useVitalsDecay';

export default function DashboardPage() {
  const { isConnected, mciMode, beds } = useER();
  const navigate = useNavigate();
  
  // Initialize decay engine
  useVitalsDecay();

  return (
    <div className="min-h-screen bg-medical-bg flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-medical-border px-6 flex items-center justify-between bg-medical-card shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
          <h1 className="text-lg font-bold tracking-tight uppercase">
            ER PRIORITY ENGINE <span className="text-[10px] font-mono text-zinc-500 ml-2">v4.0.2</span>
          </h1>
        </div>

        <div className="flex items-center gap-8">
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

          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/')}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
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
              <span className="text-zinc-600">Socket Sync: <span className={isConnected ? 'text-emerald-500' : 'text-red-500'}>
                {isConnected ? 'Connected' : 'Offline'}
              </span></span>
            </div>
            <div className="text-zinc-600">Last Scan: {new Date().toLocaleTimeString()}</div>
          </footer>
        </section>
      </main>
    </div>

  );
}
