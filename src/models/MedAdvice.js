const mongoose = require('mongoose');

const medAdviceSchema = new mongoose.Schema({
  usr_spec: { type: String, default: '', index: true },
  medadvice: { type: String, required: true, trim: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('MedAdvice', medAdviceSchema);
