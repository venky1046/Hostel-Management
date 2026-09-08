require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const studentRoutes = require('./routes/studentRoutes');
const roomRoutes = require('./routes/roomRoutes');
const allocationRoutes = require('./routes/allocationRoutes');
const feeRoutes = require('./routes/feeRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const db = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json());

// Render uses this endpoint to confirm that both the web server and MySQL are ready.
app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(503).json({ status: 'database unavailable' });
  }
});

// API routes
app.use('/api/students', studentRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/allocations', allocationRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Serve the frontend (client/) as static files, so the whole app runs
// from one server: http://localhost:5000
app.use(express.static(path.join(__dirname, '..', 'client')));

// Any unknown non-API route falls back to login.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '..', 'client', 'login.html'));
});

// Catch-all error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Hostel Management server running at http://localhost:${PORT}`);
});
