// Vercel serverless entry point
// Vercel will call this as a function — we export the Express app via serverless wrapper

const app = require('../src/app');
const connectDB = require('../src/config/db');

// Ensure DB connected before handling request
let isConnected = false;

function setCors(req, res) {
  const origin = req.headers.origin || '';
  // Allow frontend and all vercel previews
  const allowed = origin.endsWith('.vercel.app') || origin.includes('localhost');
  if (allowed || !origin) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*.vercel.app');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  }
}

module.exports = async (req, res) => {
  // Handle CORS preflight BEFORE DB connect - otherwise DB failure masks CORS and browser shows CORS error
  if (req.method === 'OPTIONS') {
    setCors(req, res);
    return res.status(200).end();
  }

  if (!isConnected) {
    try {
      await connectDB();
      isConnected = true;
    } catch (e) {
      console.error('DB connect failed in serverless:', e);
      setCors(req, res);
      const detail = e.message;
      let hint = '';
      if (detail.includes('querySrv ENOTFOUND')) {
        hint = ' Fix MONGODB_URI in Vercel: 1) Encode password Skb@12400@Kml -> Skb%4012400%40Kml  2) Host must be cluster0.xxxxx.mongodb.net (not cluster0.mongodb.net)  3) Check Atlas Network Access allow 0.0.0.0/0';
      } else if (detail.includes('authentication failed')) {
        hint = ' Check user sakib-admin and password Skb@12400@Kml (encoded as Skb%4012400%40Kml) and DB name pdcl';
      }
      return res.status(500).json({ status: 'error', message: 'Database connection failed', detail: detail + hint, database: 'pdcl' });
    }
  }
  return app(req, res);
};
