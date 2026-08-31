const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  usr_spec: { type: String, default: '', index: true },
  medicine: { type: String, required: true, trim: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

medicineSchema.index({ medicine: 'text' });

module.exports = mongoose.model('Medicine', medicineSchema);
