const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const doctorRoutes = require('./routes/doctors');
const appointmentRoutes = require('./routes/appointments');
const prescriptionRoutes = require('./routes/prescriptions');
const componentRoutes = require('./routes/components');
const searchRoutes = require('./routes/search');

const app = express();

// CORS - allow Vercel frontend domains
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

// If FRONTEND_URL contains comma-separated list, expand it
const extra = (process.env.FRONTEND_URL || '').split(',').map(s => s.trim()).filter(Boolean);
const originList = [...new Set([...allowedOrigins, ...extra])];

app.use(cors({
  origin: (origin, cb) => {
    // allow serverless preview deployments (*.vercel.app)
    if (!origin) return cb(null, true);
    if (originList.includes(origin) || origin.endsWith('.vercel.app')) return cb(null, true);
    // in production, allow all vercel previews; otherwise check list
    // For strict mode, uncomment next line to block others:
    // return cb(new Error('Not allowed by CORS'));
    return cb(null, true);
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString(), db: 'MongoDB Atlas', vercel: !!process.env.VERCEL }));
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.get('/', (req, res) => res.json({ status:'ok', message:'Press MERN Backend running. Use /api/health' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/components', componentRoutes);
app.use('/api/search', searchRoutes);

// Fallback
app.use((req, res) => res.status(404).json({ status: 'error', message: 'Route not found: '+req.originalUrl }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ status: 'error', message: err.message });
});

module.exports = app;
