const mongoose = require('mongoose');

let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not defined in env');

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      // Atlas handles retryWrites etc via URI
    }).then((m) => {
      console.log(`MongoDB Connected: ${m.connection.host} / ${m.connection.name}`);
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    console.error('MongoDB connection error:', err.message);
    console.error('Hint: If using Atlas, make sure your IP is whitelisted and cluster host is correct.');
    console.error('Current MONGODB_URI host:', (uri || '').replace(/:[^@]+@/, ':****@'));
    // Don't exit in serverless — throw instead
    if (process.env.VERCEL) throw err;
    process.exit(1);
  }
  return cached.conn;
};

module.exports = connectDB;
