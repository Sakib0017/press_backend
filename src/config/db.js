const mongoose = require('mongoose');

let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

const connectDB = async () => {
  let uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not defined in env');

  // Auto-detect unencoded password bug: Skb@12400@Kml -> causes ENOTFOUND _mongodb._tcp.12400
  // Valid URI should contain Skb%4012400%40Kml, not Skb@12400@Kml
  if (uri.includes('Skb@12400@Kml')) {
    console.error('FATAL: MONGODB_URI contains unencoded @ in password (Skb@12400@Kml).');
    console.error('Fix: Replace Skb@12400@Kml with Skb%4012400%40Kml (%40 = @) in Vercel env var.');
    // auto-fix for resilience
    uri = uri.replaceAll('Skb@12400@Kml', 'Skb%4012400%40Kml');
    console.error('Auto-fixed URI for this connection attempt. PLEASE update Vercel env var permanently.');
  }

  // Detect placeholder host cluster0.mongodb.net (invalid - must be cluster0.xxxxx.mongodb.net)
  if (uri.includes('@cluster0.mongodb.net')) {
    console.error('FATAL: MONGODB_URI host is placeholder cluster0.mongodb.net - not a valid Atlas host.');
    console.error('Fix: Atlas -> Cluster -> Connect -> Drivers -> copy host like cluster0.abc123.mongodb.net');
    console.error('Current host is invalid, will fail DNS. Database name is pdcl - ensure it exists after host: /pdcl?');
  }

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      // Atlas handles retryWrites etc via URI
    }).then((m) => {
      console.log(`MongoDB Connected: ${m.connection.host} / ${m.connection.name} (DB: ${m.connection.name})`);
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    console.error('MongoDB connection error:', err.message);
    if (err.message.includes('querySrv ENOTFOUND')) {
      console.error('CAUSE: DNS SRV lookup failed. Usually means:');
      console.error('  1. Password @ not encoded -> Skb@12400@Kml must be Skb%4012400%40Kml');
      console.error('  2. Cluster host wrong -> cluster0.mongodb.net is INVALID, need cluster0.xxxxx.mongodb.net from Atlas');
      console.error('  3. Network: Atlas Network Access -> Add IP 0.0.0.0/0 for Vercel');
    }
    console.error('Current MONGODB_URI host:', (uri || '').replace(/:[^@]+@/, ':****@'));
    console.error('Database name in URI path should be /pdcl (after .net/)');
    // Don't exit in serverless — throw instead
    if (process.env.VERCEL) throw err;
    process.exit(1);
  }
  return cached.conn;
};

module.exports = connectDB;
