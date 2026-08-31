const mongoose = require('mongoose');

const doseSchema = new mongoose.Schema({
  usr_spec: { type: String, default: '', index: true },
  dose: { type: String, required: true, trim: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Dose', doseSchema);
