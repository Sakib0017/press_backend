const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  appointment_id: { type: String, default: '' }, // can be ObjectId string or 'WALK-IN'
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
  doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  patient_name: { type: String, required: true },
  patient_mobile: { type: String, required: true },
  patient_age: { type: String, required: true },
  patient_gender: { type: String, required: true },
  patient_address: { type: String, default: '' },
  clinical_data: { type: mongoose.Schema.Types.Mixed, default: {} }, // JSON object with section arrays
  medications: { type: mongoose.Schema.Types.Mixed, default: [] }, // array of {name, instruction, dose, duration}
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Prescription', prescriptionSchema);
