// Vercel serverless entry point
// Vercel will call this as a function — we export the Express app via serverless wrapper

const app = require('../src/app');
const connectDB = require('../src/config/db');

// Ensure DB connected before handling request
let isConnected = false;

module.exports = async (req, res) => {
  if (!isConnected) {
    try {
      await connectDB();
      isConnected = true;
    } catch (e) {
      console.error('DB connect failed in serverless:', e);
      return res.status(500).json({ status: 'error', message: 'Database connection failed', detail: e.message });
    }
  }
  return app(req, res);
};
