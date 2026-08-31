// Vercel serverless entry point
// Vercel will call this as a function — we export the Express app via serverless wrapper

const app = require('../src/app');
const connectDB = require('../src/config/db');

// Ensure DB connected before handling request
let isConnected = false;

function setCors(req, res) {
  const origin = req.headers.origin || '';
  // Always set CORS for known frontend + vercel previews + localhost
  // Bug was: only set when allowed || !origin, but frontend https://press-frontend-two.vercel.app should always be allowed
  const cleanOrigin = origin.replace(/\/$/, '');
  const allowedList = [
    'https://press-frontend-two.vercel.app',
    'https://press-backend-alpha.vercel.app',
    'https://press-backend-two.vercel.app',
  ];
  const extraList = (process.env.FRONTEND_URL || '').split(',').map(s=>s.trim().replace(/\/$/, '')).filter(Boolean);
  const allowed = cleanOrigin.endsWith('.vercel.app') || cleanOrigin.includes('localhost') || allowedList.includes(cleanOrigin) || extraList.includes(cleanOrigin);
  // For serverless, always mirror origin if allowed or if origin present (to avoid browser CORS block)
  // If no origin (curl/postman), allow *
  if (allowed || !origin || cleanOrigin.endsWith('.vercel.app')) {
    // Mirror exact origin (required when credentials:true) — do not use * with credentials
    res.setHeader('Access-Control-Allow-Origin', origin || 'https://press-frontend-two.vercel.app');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Vary', 'Origin');
  } else if (origin) {
    // Fallback: still allow but warn (prevents hard block)
    console.warn(`API setCors: unexpected origin ${origin}, allowing anyway to avoid CORS block`);
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Vary', 'Origin');
  }
}

module.exports = async (req, res) => {
  // Handle CORS preflight BEFORE DB connect - otherwise DB failure masks CORS and browser shows CORS error
  // Must set CORS for ALL requests, not just OPTIONS, so DB errors still return CORS headers
  setCors(req, res);
  if (req.method === 'OPTIONS') {
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
