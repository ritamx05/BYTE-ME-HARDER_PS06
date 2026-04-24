import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Types ─────────────────────────────────────────────────────────────────────
type BedStatus = 'available' | 'occupied' | 'reserved';
type Dept = 'ER' | 'OPD';
type Spec = 'ENT' | 'Cardiology' | 'Surgeon' | 'General' | 'Orthopedic';

interface Bed   { id: string; number: number; status: BedStatus; patientId: string | null; }
interface Room  { id: string; number: number; beds: Bed[]; }
interface Doctor { id: string; name: string; specialization: Spec; department: Dept; isAvailable: boolean; currentPatientId: string | null; }
interface Patient {
  id: string; name: string; severity: number;
  arrivalType: 'Walk-in' | 'Ambulance'; isAmbulance: boolean;
  department: Dept;
  waitTime: number; priorityScore: number; survivalProbability: number;
  status: 'waiting' | 'assigned' | 'with_doctor' | 'treated';
  bedId: string | null; doctorId: string | null;
  arrivedAt: number; arrivedAtMs: number; arrivalTime: string;
  arrivalOrder: number;
}
interface Reservation { id: string; bedId: string; expiresAt: number; timerId?: ReturnType<typeof setTimeout>; }

// ── State ─────────────────────────────────────────────────────────────────────
let rooms: Record<Dept, Room[]> = { ER: [], OPD: [] };
let doctors: Doctor[] = [];
let patients: Patient[] = [];
let reservations: Reservation[] = [];
let mciMode = false;
let configured = false;
let nextDocId = 1;
let nextResId = 1;
let arrivalCounters: Record<Dept, number> = { ER: 0, OPD: 0 };

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcSVP(sev: number) { return Math.max(5, 100 - sev * 8); }

function calcPriority(p: Patient, mci: boolean): number {
  const w = Math.floor((Date.now() - p.arrivedAtMs) / 60_000);
  if (mci) {
    if (p.survivalProbability < 15) return p.severity * 4 + w * 0.2;
    if (p.severity >= 9) return p.severity * 7 + w * 0.5;
    return p.severity * 10 + w * 0.7 + p.survivalProbability * 0.2;
  }
  return p.severity * 10 + w * 0.5;
}

function recalc() {
  patients = patients.map(p => ({
    ...p,
    waitTime: Math.floor((Date.now() - p.arrivedAtMs) / 60_000),
    priorityScore: calcPriority(p, mciMode),
  }));
}

function erQueue()  { return patients.filter(p => p.department === 'ER').sort((a,b) => b.priorityScore - a.priorityScore); }
function opdQueue() { return patients.filter(p => p.department === 'OPD').sort((a,b) => a.arrivalOrder - b.arrivalOrder); }
function dashboardPatients() { return [...erQueue(), ...opdQueue()]; }

function flatBeds() {
  const all = [...rooms.ER, ...rooms.OPD].flatMap(r => r.beds);
  return { total: all.length, available: all.filter(b => b.status === 'available').length, reserved: all.filter(b => b.status === 'reserved').length };
}

function generateRooms(dept: Dept, numRooms: number, bedsPerRoom: number): Room[] {
  return Array.from({ length: numRooms }, (_, r) => ({
    id: `${dept}-R${r+1}`, number: r+1,
    beds: Array.from({ length: bedsPerRoom }, (_, b) => ({
      id: `${dept}-R${r+1}-B${b+1}`, number: b+1, status: 'available' as BedStatus, patientId: null,
    })),
  }));
}

function findAvailableBed(dept: Dept): { room: Room; bed: Bed } | null {
  for (const room of rooms[dept]) {
    const bed = room.beds.find(b => b.status === 'available');
    if (bed) return { room, bed };
  }
  return null;
}

function getBedById(bedId: string): Bed | null {
  for (const dept of ['ER','OPD'] as Dept[])
    for (const room of rooms[dept]) { const b = room.beds.find(b => b.id === bedId); if (b) return b; }
  return null;
}

function findDoctor(dept: Dept, severity: number): Doctor | null {
  const avail = doctors.filter(d => d.department === dept && d.isAvailable);
  if (!avail.length) return null;
  // Severity 6–10 → specialist (Cardiology / Surgeon / Orthopedic)
  if (severity >= 6) return avail.find(d => ['Cardiology','Surgeon','Orthopedic'].includes(d.specialization)) ?? avail[0];
  // Severity 3–5 → General
  if (severity >= 3) return avail.find(d => d.specialization === 'General') ?? avail[0];
  // Severity 1–2 → any
  return avail[0];
}

function broadcastFull(io: Server) {
  io.emit('update_queue', dashboardPatients());
  io.emit('update_beds', flatBeds());
  io.emit('update_reservations', reservations.map(({ id, expiresAt }) => ({ id, expiresAt })));
  io.emit('update_mci', mciMode);
  io.emit('doctors_updated', doctors);
  io.emit('rooms_updated', rooms);
}

// ── Auto-Escalation ───────────────────────────────────────────────────────────
// Critical (sev ≥ 7) → assign bed after 1 min | Stable → send to doctor after 2 min
function scheduleEscalation(patient: Patient, io: Server) {
  const isCrit = patient.severity >= 7;
  setTimeout(() => {
    const p = patients.find(x => x.id === patient.id);
    if (!p || p.status !== 'waiting') return;
    if (isCrit) {
      const result = findAvailableBed(p.department);
      if (!result) return;
      result.bed.status = 'occupied'; result.bed.patientId = p.id;
      p.bedId = result.bed.id; p.status = 'assigned';
      const doc = findDoctor(p.department, p.severity);
      if (doc) { doc.isAvailable = false; doc.currentPatientId = p.id; p.doctorId = doc.id; }
      recalc(); broadcastFull(io);
      io.emit('patient_escalated', { patient: p, action: 'bed_assigned', message: `${p.name} auto-escalated → ${p.bedId}` });
    } else {
      p.status = 'with_doctor'; recalc(); broadcastFull(io);
      io.emit('patient_escalated', { patient: p, action: 'with_doctor', message: `${p.name} sent to available doctor` });
    }
  }, isCrit ? 60_000 : 120_000);
}

// ── Server ────────────────────────────────────────────────────────────────────
async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: '*', methods: ['GET','POST'] } });
  const PORT = 5000;

  io.on('connection', socket => {
    console.log('Client connected:', socket.id);

    // Send full state immediately
    socket.emit('initial_state', {
      patients: dashboardPatients(), beds: flatBeds(),
      reservations: reservations.map(({ id, expiresAt }) => ({ id, expiresAt })),
      mciMode, rooms, doctors, configured,
    });

    // ── EXISTING events (dashboard-compatible) ──────────────────────────────

    socket.on('add_patient', (data: { name: string; severity: number; arrivalType: 'Walk-in'|'Ambulance'; department?: Dept }) => {
      const dept: Dept = data.department ?? 'ER';
      const sev = Number(data.severity);
      const now = Date.now();
      const p: Patient = {
        id: Math.random().toString(36).slice(2,11),
        name: data.name, severity: sev,
        arrivalType: data.arrivalType, isAmbulance: data.arrivalType === 'Ambulance',
        department: dept, waitTime: 0, priorityScore: 0,
        survivalProbability: calcSVP(sev), status: 'waiting',
        bedId: null, doctorId: null,
        arrivedAt: now, arrivedAtMs: now, arrivalTime: new Date(now).toISOString(),
        arrivalOrder: ++arrivalCounters[dept],
      };
      p.priorityScore = calcPriority(p, mciMode);
      patients.push(p);
      recalc();
      io.emit('update_queue', dashboardPatients());
      scheduleEscalation(p, io);
    });

    socket.on('assign_bed', () => {
      if (flatBeds().available <= 0) { socket.emit('error', 'No beds available'); return; }
      const next = [...erQueue(), ...opdQueue()].find(p => p.status === 'waiting');
      if (!next) { socket.emit('error', 'No waiting patients'); return; }
      const result = findAvailableBed(next.department);
      if (!result) { socket.emit('error', `No beds in ${next.department}`); return; }
      result.bed.status = 'occupied'; result.bed.patientId = next.id;
      next.bedId = result.bed.id; next.status = 'assigned';
      const doc = findDoctor(next.department, next.severity);
      if (doc) { doc.isAvailable = false; doc.currentPatientId = next.id; next.doctorId = doc.id; }
      recalc(); broadcastFull(io);
      io.emit('patient_escalated', { patient: next, action: 'bed_assigned', message: `${next.name} assigned to ${next.bedId}` });
    });

    socket.on('reserve_bed', () => {
      if (flatBeds().available <= 0) { socket.emit('error', 'No beds available'); return; }
      const result = findAvailableBed('ER') ?? findAvailableBed('OPD');
      if (!result) return;
      const resId = `res-${nextResId++}`;
      const expiresAt = Date.now() + 120_000;
      result.bed.status = 'reserved';
      const timerId = setTimeout(() => {
        const b = getBedById(result.bed.id);
        if (b && b.status === 'reserved') b.status = 'available';
        reservations = reservations.filter(r => r.id !== resId);
        io.emit('update_beds', flatBeds()); io.emit('rooms_updated', rooms);
        io.emit('update_reservations', reservations.map(({ id, expiresAt }) => ({ id, expiresAt })));
      }, 120_000);
      reservations.push({ id: resId, bedId: result.bed.id, expiresAt, timerId });
      io.emit('update_beds', flatBeds()); io.emit('rooms_updated', rooms);
      io.emit('update_reservations', reservations.map(({ id, expiresAt }) => ({ id, expiresAt })));
    });

    socket.on('toggle_mci', (newVal: boolean) => {
      mciMode = newVal; recalc();
      io.emit('update_mci', mciMode); io.emit('update_queue', dashboardPatients());
    });

    // ── NEW events (System Protocol page) ──────────────────────────────────

    socket.on('setup_config', ({ ERRooms, ERBedsPerRoom, OPDRooms, OPDBedsPerRoom }: { ERRooms:number; ERBedsPerRoom:number; OPDRooms:number; OPDBedsPerRoom:number }) => {
      reservations.forEach(r => r.timerId && clearTimeout(r.timerId));
      rooms.ER  = generateRooms('ER',  ERRooms,  ERBedsPerRoom);
      rooms.OPD = generateRooms('OPD', OPDRooms, OPDBedsPerRoom);
      patients = []; reservations = [];
      arrivalCounters = { ER: 0, OPD: 0 };
      configured = true;
      broadcastFull(io);
      socket.emit('config_saved', { success: true });
    });

    socket.on('add_doctor', ({ name, specialization, department }: { name:string; specialization:Spec; department:Dept }) => {
      doctors.push({ id: `DOC-${nextDocId++}`, name, specialization, department, isAvailable: true, currentPatientId: null });
      io.emit('doctors_updated', doctors);
    });

    socket.on('remove_doctor', ({ doctorId }: { doctorId: string }) => {
      doctors = doctors.filter(d => d.id !== doctorId);
      io.emit('doctors_updated', doctors);
    });

    socket.on('release_patient', ({ patientId }: { patientId: string }) => {
      const p = patients.find(x => x.id === patientId);
      if (!p) return;
      if (p.bedId) { const b = getBedById(p.bedId); if (b) { b.status = 'available'; b.patientId = null; } }
      if (p.doctorId) { const doc = doctors.find(d => d.id === p.doctorId); if (doc) { doc.isAvailable = true; doc.currentPatientId = null; } }
      p.status = 'treated'; p.bedId = null; p.doctorId = null;
      recalc(); broadcastFull(io);
    });

    socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
  });

  // ── Vitals Decay (60s) ────────────────────────────────────────────────────
  setInterval(() => {
    recalc();
    io.emit('update_queue', dashboardPatients());
    // Expire reservations
    const now = Date.now();
    const expired = reservations.filter(r => r.expiresAt <= now);
    if (expired.length) {
      expired.forEach(r => { const b = getBedById(r.bedId); if (b && b.status === 'reserved') b.status = 'available'; });
      reservations = reservations.filter(r => r.expiresAt > now);
      io.emit('update_beds', flatBeds()); io.emit('rooms_updated', rooms);
      io.emit('update_reservations', reservations.map(({ id, expiresAt }) => ({ id, expiresAt })));
    }
  }, 60_000);

  // ── Vite middleware ───────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
  }

  httpServer.listen(PORT, '0.0.0.0', () => console.log(`ER Priority Engine → http://localhost:${PORT}`));
}

startServer();
