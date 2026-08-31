const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patient_name: { type: String, required: true, trim: true },
  patient_contact: { type: String, required: true },
  patient_age: { type: String, required: true },
  patient_gender: { type: String, required: true, enum: ['Male', 'Female', 'Other'] },
  doctor_name: { type: String, required: true, trim: true }, // keep denormalized like PHP (doctor_name LIKE search)
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null },
  appointment_date: { type: Date, required: true },
  status: { type: String, enum: ['waiting', 'completed', 'cancelled'], default: 'waiting' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// For backward compatibility with PHP's appointment_id auto-increment
// Mongoose _id is used; also add virtual appointment_id
appointmentSchema.virtual('appointment_id').get(function () {
  return this._id;
});
appointmentSchema.set('toJSON', { virtuals: true });
appointmentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Appointment', appointmentSchema);
