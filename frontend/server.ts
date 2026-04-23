import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Mock Data & System State
  let patients = [
    { id: '1', name: 'John Doe', severity: 8, arrivalType: 'Ambulance', waitTime: 5, priorityScore: 85, status: 'Waiting', bedId: null, arrivedAt: Date.now() - 300000 },
    { id: '2', name: 'Jane Smith', severity: 4, arrivalType: 'Walk-in', waitTime: 12, priorityScore: 48, status: 'Waiting', bedId: null, arrivedAt: Date.now() - 720000 },
  ];

  let beds = {
    total: 10,
    available: 7,
    reserved: 1,
  };

  let reservations = [
    { id: 'res-1', expiresAt: Date.now() + 120000 },
  ];

  let mciMode = false;

  // Priority Calculation Logic
  const calculatePriority = (p: any, mci: boolean) => {
    const waitTimeMinutes = Math.floor((Date.now() - p.arrivedAt) / 60000);
    if (mci) {
      // Survival-based: 10 is high severity, but maybe 7-9 are most 'savable'
      // For simplicity: severity * 10 + waitTime
      return (p.severity * 10) + waitTimeMinutes;
    } else {
      // Severity-based: severity * 10 + waitTime
      return (p.severity * 10) + waitTimeMinutes;
    }
  };

  const updateAllPriorities = () => {
    patients = patients.map(p => ({
      ...p,
      waitTime: Math.floor((Date.now() - p.arrivedAt) / 60000),
      priorityScore: calculatePriority(p, mciMode)
    })).sort((a, b) => b.priorityScore - a.priorityScore);
  };

  // Socket Events
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Send initial state
    socket.emit('initial_state', { patients, beds, reservations, mciMode });

    socket.on('add_patient', (patientData) => {
      const newPatient = {
        id: Math.random().toString(36).substr(2, 9),
        ...patientData,
        waitTime: 0,
        status: 'Waiting',
        bedId: null,
        arrivedAt: Date.now(),
        priorityScore: calculatePriority({ ...patientData, arrivedAt: Date.now() }, mciMode)
      };
      patients.push(newPatient);
      updateAllPriorities();
      io.emit('update_queue', patients);
    });

    socket.on('assign_bed', () => {
      if (beds.available <= 0) {
        socket.emit('error', 'No beds available');
        return;
      }
      
      const nextPatient = patients.find(p => p.status === 'Waiting');
      if (nextPatient) {
        nextPatient.status = 'Assigned';
        nextPatient.bedId = `BED-${11 - beds.available}`;
        beds.available -= 1;
        io.emit('update_queue', patients);
        io.emit('update_beds', beds);
      }
    });

    socket.on('reserve_bed', () => {
      if (beds.available <= 0) {
        socket.emit('error', 'No beds available to reserve');
        return;
      }
      const resId = `res-${Math.random().toString(36).substr(2, 5)}`;
      reservations.push({ id: resId, expiresAt: Date.now() + 120000 });
      beds.available -= 1;
      beds.reserved += 1;
      io.emit('update_beds', beds);
      io.emit('update_reservations', reservations);
    });

    socket.on('toggle_mci', (newVal) => {
      mciMode = newVal;
      updateAllPriorities();
      io.emit('update_mci', mciMode);
      io.emit('update_queue', patients);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // Vitals Decay Engine (Server Side)
  setInterval(() => {
    updateAllPriorities();
    io.emit('update_queue', patients);

    // Check reservations
    const now = Date.now();
    const initialResCount = reservations.length;
    reservations = reservations.filter(res => res.expiresAt > now);
    if (reservations.length < initialResCount) {
      const expiredCount = initialResCount - reservations.length;
      beds.reserved -= expiredCount;
      beds.available += expiredCount;
      io.emit('update_beds', beds);
      io.emit('update_reservations', reservations);
    }
  }, 60000); // 60s as requested in core features

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
