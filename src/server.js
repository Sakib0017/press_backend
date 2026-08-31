require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Local dev: connect DB then listen
// On Vercel, this file is NOT used as entry — api/index.js handles it
if (require.main === module) {
  connectDB().then(() => {
    app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
  });
}

module.exports = app;
