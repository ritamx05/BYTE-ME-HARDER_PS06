/**
 * server.js
 * ER Priority Engine — Main Entry Point
 *
 * Initializes:
 *  - Express app
 *  - HTTP server
 *  - Socket.io
 *  - All routes
 *  - Socket handlers
 *  - Vitals Decay Engine
 *  - Reservation broadcast injection
 */

require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const patientRoutes = require('./routes/patientRoutes');
const bedRoutes = require('./routes/bedRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const mciRoutes = require('./routes/mciRoutes');

const { registerSocketHandlers } = require('./socket/socketHandler');
const { setIO: setReservationIO } = require('./services/reservationService');
const { setIO: setDecayIO, startDecayEngine } = require('./services/decayEngine');

// ─── App Setup ────────────────────────────────────────────────────────────────

const app = express();
const httpServer = http.createServer(app);

// CORS — allow frontend dev server and any localhost origin
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'DELETE'],
  },
});

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach io to app so controllers can broadcast
app.set('io', io);

// ─── Request Logger ───────────────────────────────────────────────────────────

app.use((req, _res, next) => {
  console.log(`[HTTP] ${req.method} ${req.path}`);
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/', (_req, res) => {
  res.json({
    service: 'ER Priority Engine',
    version: '1.0.0',
    status: 'running',
    endpoints: [
      'GET  /patients',
      'POST /patients',
      'GET  /beds',
      'POST /beds/assign',
      'POST /assign-bed    (alias)',
      'GET  /reservations',
      'POST /reservations',
      'DELETE /reservations/:id',
      'POST /reserve       (alias)',
      'GET  /mode',
      'POST /toggle-mci',
    ],
  });
});

// Core routes
app.use('/patients', patientRoutes);
app.use('/beds', bedRoutes);
app.use('/reservations', reservationRoutes);
app.use('/', mciRoutes);

// Aliases (as specified in requirements)
app.post('/assign-bed', (req, res) => res.redirect(307, '/beds/assign'));
app.post('/reserve', (req, res) => res.redirect(307, '/reservations'));

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error.', detail: err.message });
});

// ─── Socket.io ────────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  registerSocketHandlers(io, socket);
});

// ─── Inject IO into services ──────────────────────────────────────────────────

setReservationIO(io);
setDecayIO(io);

// ─── Start Decay Engine ───────────────────────────────────────────────────────

startDecayEngine();

// ─── Start Server ─────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT, 10) || 5000;

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║       ER Priority Engine — ONLINE        ║`);
  console.log(`╠══════════════════════════════════════════╣`);
  console.log(`║  HTTP  → http://localhost:${PORT}           ║`);
  console.log(`║  WS    → ws://localhost:${PORT}             ║`);
  console.log(`║  Mode  → ${process.env.NODE_ENV || 'development'}                    ║`);
  console.log(`╚══════════════════════════════════════════╝\n`);
});
