const mongoose = require('mongoose');

const componentSchema = new mongoose.Schema({
  doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  name_en: { type: String, required: true },
  com_name: { type: String, required: true }, // section id e.g. complaints, history
  sub_com_name: { type: String, required: true },
}, { timestamps: true });

componentSchema.index({ doctor_id: 1, com_name: 1 });

module.exports = mongoose.model('Component', componentSchema);
