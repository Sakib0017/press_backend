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
// Fix: Preflight from https://press-frontend-two.vercel.app to https://press-backend-two.vercel.app was blocked
// Previous logic worked locally but Vercel serverless needs explicit OPTIONS handling
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'https://press-frontend-two.vercel.app',
  'https://press-frontend.vercel.app',
].filter(Boolean);

const extra = (process.env.FRONTEND_URL || '').split(',').map(s => s.trim()).filter(Boolean);
const originList = [...new Set([...allowedOrigins, ...extra])];

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (originList.includes(origin) || origin.endsWith('.vercel.app')) return cb(null, true);
    return cb(null, true);
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS','PATCH'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With','Accept','Origin'],
  exposedHeaders: ['Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

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
