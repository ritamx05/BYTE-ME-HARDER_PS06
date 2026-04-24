import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { ArrowLeft, ChevronRight, Trash2, UserPlus, Cpu } from 'lucide-react';
import type { Doctor, Room, Dept, Spec } from '../types';

// ── live countdown for "connected since" banner ───────────────────────────────
function LiveClock() {
  const [t, setT] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
  return <span className="font-mono tabular-nums text-zinc-400 text-xs">{t.toLocaleTimeString([], { hour12: false })}</span>;
}

// ── Room grid visual ──────────────────────────────────────────────────────────
function RoomGrid({ rooms }: { rooms: Room[] }) {
  if (!rooms.length) return <p className="text-[10px] font-mono text-zinc-600 uppercase">No rooms configured</p>;
  return (
    <div className="space-y-3 mt-3">
      {rooms.map(room => (
        <div key={room.id}>
          <p className="text-[9px] font-mono uppercase text-zinc-600 mb-1">Room {room.number}</p>
          <div className="flex flex-wrap gap-1.5">
            {room.beds.map(bed => (
              <div key={bed.id}
                title={`${bed.id} — ${bed.status}`}
                className={`w-7 h-7 flex items-center justify-center text-[8px] font-mono font-bold border transition-all ${
                  bed.status === 'available' ? 'border-emerald-700 bg-emerald-900/20 text-emerald-500' :
                  bed.status === 'occupied'  ? 'border-red-700    bg-red-900/20    text-red-500'     :
                                              'border-orange-700  bg-orange-900/20  text-orange-500'
                }`}>
                {bed.number}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Protocol Page ────────────────────────────────────────────────────────
export default function ProtocolPage() {
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [rooms, setRooms] = useState<Record<Dept, Room[]>>({ ER: [], OPD: [] });
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [saved, setSaved] = useState(false);

  // Bed config form
  const [erRooms,    setErRooms]    = useState(3);
  const [erBeds,     setErBeds]     = useState(4);
  const [opdRooms,   setOpdRooms]   = useState(3);
  const [opdBeds,    setOpdBeds]    = useState(4);

  // Doctor add form
  const [docName, setDocName] = useState('');
  const [docSpec, setDocSpec] = useState<Spec>('General');
  const [docDept, setDocDept] = useState<Dept>('ER');

  // ── Socket connection ───────────────────────────────────────────────────────
  useEffect(() => {
    const s = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', { transports: ['websocket', 'polling'] });
    socketRef.current = s;

    s.on('connect',    () => setConnected(true));
    s.on('disconnect', () => setConnected(false));

    s.on('initial_state', (data: { rooms?: Record<Dept, Room[]>; doctors?: Doctor[]; configured?: boolean }) => {
      if (data.rooms)     setRooms(data.rooms);
      if (data.doctors)   setDoctors(data.doctors);
      if (data.configured !== undefined) setConfigured(data.configured);
    });

    s.on('rooms_updated',   (r: Record<Dept, Room[]>) => setRooms(r));
    s.on('doctors_updated', (d: Doctor[]) => setDoctors(d));
    s.on('config_saved',    ({ success }: { success: boolean }) => { if (success) { setConfigured(true); setSaved(true); setTimeout(() => setSaved(false), 2000); } });

    return () => { s.disconnect(); };
  }, []);

  const applyConfig = () => {
    socketRef.current?.emit('setup_config', {
      ERRooms: erRooms, ERBedsPerRoom: erBeds,
      OPDRooms: opdRooms, OPDBedsPerRoom: opdBeds,
    });
  };

  const addDoctor = () => {
    if (!docName.trim()) return;
    socketRef.current?.emit('add_doctor', { name: docName.trim().toUpperCase(), specialization: docSpec, department: docDept });
    setDocName('');
  };

  const removeDoctor = (id: string) => socketRef.current?.emit('remove_doctor', { doctorId: id });

  const erTotalBeds  = erRooms  * erBeds;
  const opdTotalBeds = opdRooms * opdBeds;
  const erDoctors    = doctors.filter(d => d.department === 'ER');
  const opdDoctors   = doctors.filter(d => d.department === 'OPD');

  return (
    <div className="min-h-screen bg-medical-bg flex flex-col">
      {/* ── Header ── */}
      <header className="h-16 border-b border-medical-border px-6 flex items-center justify-between bg-medical-card shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
          <h1 className="text-lg font-bold tracking-tight uppercase">
            ER PRIORITY ENGINE <span className="text-[10px] font-mono text-zinc-500 ml-2">SYSTEM PROTOCOL</span>
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <LiveClock />
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-red-600'}`} />
            <span className={connected ? 'text-emerald-500' : 'text-red-500'}>{connected ? 'Connected' : 'Offline'}</span>
          </div>
          <button onClick={() => navigate('/')} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors">
            <ArrowLeft size={20} />
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 space-y-8">

        {/* ── Status bar ── */}
        <div className="flex items-center gap-6 text-[10px] font-mono uppercase text-zinc-500">
          <span><Cpu size={11} className="inline mr-1" />System Status:</span>
          <span className={configured ? 'text-emerald-500' : 'text-orange-400'}>
            {configured ? '✓ Configured & Ready' : '⚠ Not Configured — Apply bed layout below'}
          </span>
          {configured && (
            <>
              <span className="text-zinc-700">|</span>
              <span>ER: {rooms.ER.flatMap(r=>r.beds).length} beds</span>
              <span>OPD: {rooms.OPD.flatMap(r=>r.beds).length} beds</span>
              <span>Doctors: {doctors.length}</span>
            </>
          )}
        </div>

        {/* ── Section 1: Bed Configuration ── */}
        <section>
          <h2 className="text-xs font-bold uppercase text-zinc-500 tracking-widest mb-4 flex items-center gap-2">
            <span className="w-px h-4 bg-emerald-600" />
            Department &amp; Bed Configuration
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ER */}
            <div className="border border-medical-border bg-medical-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-red-600" />
                <span className="text-xs font-bold uppercase tracking-widest">Emergency Ward (ER)</span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase text-zinc-500 block mb-1">Number of Rooms</label>
                  <input type="number" min={1} max={20} value={erRooms}
                    onChange={e => setErRooms(Math.max(1, parseInt(e.target.value)||1))}
                    className="tech-input w-full" />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-zinc-500 block mb-1">Beds per Room</label>
                  <input type="number" min={1} max={20} value={erBeds}
                    onChange={e => setErBeds(Math.max(1, parseInt(e.target.value)||1))}
                    className="tech-input w-full" />
                </div>
                <div className="text-[10px] font-mono text-emerald-500 uppercase">
                  → {erRooms} rooms × {erBeds} beds = <strong>{erTotalBeds} total ER beds</strong>
                </div>
              </div>
              {/* Room grid preview */}
              {rooms.ER.length > 0 && <RoomGrid rooms={rooms.ER} />}
            </div>

            {/* OPD */}
            <div className="border border-medical-border bg-medical-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs font-bold uppercase tracking-widest">OPD Ward</span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase text-zinc-500 block mb-1">Number of Rooms</label>
                  <input type="number" min={1} max={20} value={opdRooms}
                    onChange={e => setOpdRooms(Math.max(1, parseInt(e.target.value)||1))}
                    className="tech-input w-full" />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-zinc-500 block mb-1">Beds per Room</label>
                  <input type="number" min={1} max={20} value={opdBeds}
                    onChange={e => setOpdBeds(Math.max(1, parseInt(e.target.value)||1))}
                    className="tech-input w-full" />
                </div>
                <div className="text-[10px] font-mono text-blue-500 uppercase">
                  → {opdRooms} rooms × {opdBeds} beds = <strong>{opdTotalBeds} total OPD beds</strong>
                </div>
              </div>
              {rooms.OPD.length > 0 && <RoomGrid rooms={rooms.OPD} />}
            </div>
          </div>

          {/* Apply button */}
          <div className="flex items-center gap-4 mt-4">
            <button onClick={applyConfig}
              className="tech-button bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 text-xs">
              {saved ? '✓ Configuration Applied' : 'Apply Configuration & Generate Beds'}
            </button>
            {configured && !saved && (
              <span className="text-[10px] font-mono text-emerald-600 uppercase">✓ Previously configured — applying will reset patient queue</span>
            )}
          </div>
        </section>

        <div className="h-px bg-medical-border" />

        {/* ── Section 2: Doctor Configuration ── */}
        <section>
          <h2 className="text-xs font-bold uppercase text-zinc-500 tracking-widest mb-4 flex items-center gap-2">
            <span className="w-px h-4 bg-emerald-600" />
            Doctor Configuration
          </h2>

          {/* Assignment rules */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { range: 'Severity 6–10', spec: 'Cardiology / Surgeon / Orthopedic', color: 'border-red-900/40 text-red-500 bg-red-900/10' },
              { range: 'Severity 3–5',  spec: 'General Physician',                 color: 'border-yellow-900/40 text-yellow-500 bg-yellow-900/10' },
              { range: 'Severity 1–2',  spec: 'Any Available Doctor',              color: 'border-emerald-900/40 text-emerald-500 bg-emerald-900/10' },
            ].map(r => (
              <div key={r.range} className={`border px-3 py-2 text-[9px] font-mono uppercase ${r.color}`}>
                <p className="font-bold">{r.range}</p>
                <p className="text-zinc-500 mt-0.5">→ {r.spec}</p>
              </div>
            ))}
          </div>

          {/* Add doctor form */}
          <div className="border border-medical-border bg-medical-card p-5 mb-4">
            <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest mb-3">Add Doctor</p>
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-40">
                <label className="text-[10px] uppercase text-zinc-600 block mb-1">Name</label>
                <input className="tech-input w-full uppercase" placeholder="DR. FULL NAME" value={docName}
                  onChange={e => setDocName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addDoctor()} />
              </div>
              <div className="w-40">
                <label className="text-[10px] uppercase text-zinc-600 block mb-1">Specialization</label>
                <select className="tech-input w-full" value={docSpec} onChange={e => setDocSpec(e.target.value as Spec)}>
                  <option value="General">General</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Surgeon">Surgeon</option>
                  <option value="Orthopedic">Orthopedic</option>
                  <option value="ENT">ENT</option>
                </select>
              </div>
              <div className="w-32">
                <label className="text-[10px] uppercase text-zinc-600 block mb-1">Department</label>
                <select className="tech-input w-full" value={docDept} onChange={e => setDocDept(e.target.value as Dept)}>
                  <option value="ER">ER</option>
                  <option value="OPD">OPD</option>
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={addDoctor} disabled={!docName.trim()}
                  className="tech-button bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white px-5 py-3 text-xs flex items-center gap-2">
                  <UserPlus size={13} /> Add
                </button>
              </div>
            </div>
          </div>

          {/* Doctor list split by department */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['ER', 'OPD'] as Dept[]).map(dept => {
              const list = dept === 'ER' ? erDoctors : opdDoctors;
              const accent = dept === 'ER' ? 'text-red-500 border-red-900/30' : 'text-blue-400 border-blue-900/30';
              return (
                <div key={dept} className="border border-medical-border bg-medical-card">
                  <div className={`flex items-center gap-2 px-4 py-2 border-b border-medical-border text-[10px] font-bold uppercase tracking-widest ${accent}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${dept === 'ER' ? 'bg-red-600' : 'bg-blue-500'}`} />
                    {dept} Doctors ({list.length})
                  </div>
                  {list.length === 0 ? (
                    <p className="px-4 py-5 text-[10px] font-mono text-zinc-600 uppercase"> {'>'} No doctors assigned</p>
                  ) : (
                    <div className="divide-y divide-[#1a1a1a]">
                      {list.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-900/40 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                              {doc.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-bold uppercase tracking-tight">{doc.name}</p>
                              <p className="text-[9px] font-mono text-zinc-500 uppercase">{doc.specialization} · {doc.id}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-[9px] font-mono uppercase font-bold ${doc.isAvailable ? 'text-emerald-500' : 'text-orange-400'}`}>
                              {doc.isAvailable ? '● Available' : '● Busy'}
                            </span>
                            <button onClick={() => removeDoctor(doc.id)}
                              className="p-1 text-zinc-600 hover:text-red-500 transition-colors">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <div className="h-px bg-medical-border" />

        {/* ── CTA ── */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/')} className="tech-button border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 px-6 py-3 text-xs flex items-center gap-2">
            <ArrowLeft size={13} /> Back to Landing
          </button>
          <button onClick={() => navigate('/dashboard')}
            className="tech-button bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-3 text-xs flex items-center gap-2">
            Initialize Dashboard <ChevronRight size={14} />
          </button>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="h-10 border-t border-medical-border px-6 flex items-center text-[9px] font-mono uppercase text-zinc-700 bg-medical-card shrink-0">
        <span>Engine: <span className="text-emerald-600">Running</span></span>
        <span className="mx-4 text-zinc-800">|</span>
        <span>Socket: <span className={connected ? 'text-emerald-500' : 'text-red-500'}>{connected ? 'Connected' : 'Offline'}</span></span>
        <span className="mx-4 text-zinc-800">|</span>
        <span>Bed Layout: <span className={configured ? 'text-emerald-500' : 'text-orange-400'}>{configured ? 'Applied' : 'Pending'}</span></span>
        <span className="mx-4 text-zinc-800">|</span>
        <span>Doctors: <span className="text-white">{doctors.length}</span></span>
      </footer>
    </div>
  );
}
