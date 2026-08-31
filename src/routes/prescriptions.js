const express = require('express');
const Prescription = require('../models/Prescription');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');

const router = express.Router();

// Helper to parse clinical_data/medications if stringified
function parseMaybeJSON(v, fallback) {
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { return fallback; }
  }
  return v ?? fallback;
}

// POST /api/prescriptions  -> save_prescription.php
router.post('/', async (req, res) => {
  try {
    let data = req.body;
    // Support both JSON body and already parsed
    const clinical_data = parseMaybeJSON(data.clinical_data, {});
    const medications   = parseMaybeJSON(data.medications, []);

    const pres = await Prescription.create({
      appointment_id: data.appointment_id || '',
      appointment: data.appointment_id && data.appointment_id !== 'WALK-IN' ? data.appointment_id : null,
      doctor_id: data.doctor_id,
      patient_name: data.patient_name,
      patient_mobile: data.patient_mobile,
      patient_age: data.patient_age,
      patient_gender: data.patient_gender,
      patient_address: data.patient_address || '',
      clinical_data,
      medications,
    });

    // If appointment_id is real, mark completed automatically? keep separate like PHP (frontend calls complete_appointment)
    res.json({ status: 'success', prescription_id: pres._id, data: pres });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /api/prescriptions?doctor_id=&from_date=&to_date=&patient_name=&prescription_id=  -> pres_list.php
router.get('/', async (req, res) => {
  try {
    const { doctor_id, from_date, to_date, patient_name, prescription_id, doctor_name } = req.query;
    const filter = {};

    if (doctor_id) filter.doctor_id = doctor_id;
    if (doctor_name && !doctor_id) {
      const doc = await Doctor.findOne({ name: { $regex: doctor_name, $options: 'i' } });
      if (doc) filter.doctor_id = doc._id;
    }
    if (prescription_id) {
      filter._id = prescription_id;
    }
    if (patient_name) {
      filter.patient_name = { $regex: patient_name, $options: 'i' };
    }

    let query = Prescription.find(filter).populate('doctor_id').sort({ created_at: -1 }).lean();

    let prescriptions = await query;

    // Date filter via appointment_date if exists else created_at fallback
    // For simplicity filter by created_at if from_date/to_date given
    if (from_date && to_date) {
      const from = new Date(from_date); from.setHours(0,0,0,0);
      const to = new Date(to_date); to.setHours(23,59,59,999);
      prescriptions = prescriptions.filter(p => {
        // Try appointment date if populated via separate lookup? For now use created_at
        const d = p.created_at ? new Date(p.created_at) : new Date(p.createdAt);
        return d >= from && d <= to;
      });
    }

    // Enrich with appointment_date if appointment exists
    const appointmentIds = prescriptions.map(p => p.appointment).filter(Boolean);
    const appts = await Appointment.find({ _id: { $in: appointmentIds } }).lean();
    const apptMap = Object.fromEntries(appts.map(a => [String(a._id), a]));

    const enriched = prescriptions.map(p => ({
      ...p,
      id: p._id,
      appointment_date: p.appointment ? (apptMap[String(p.appointment)]?.appointment_date || p.created_at) : p.created_at,
      doctor_name: p.doctor_id?.name || p.doctor_id?.name || '',
      usr_spec: p.doctor_id?.usr_spec || '',
    }));

    res.json({ status: 'success', data: enriched });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /api/prescriptions/:id  -> print_prescription.php / edit_prescription.php
router.get('/:id', async (req, res) => {
  try {
    const pres = await Prescription.findById(req.params.id).populate('doctor_id').lean();
    if (!pres) return res.status(404).json({ status: 'error', message: 'Prescription not found' });

    // Fetch appointment if linked
    let appointment = null;
    if (pres.appointment) appointment = await Appointment.findById(pres.appointment).lean();

    res.json({
      status: 'success',
      data: {
        ...pres,
        id: pres._id,
        doctor: pres.doctor_id,
        appointment,
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// PUT /api/prescriptions/:id  -> update_prescription.php
router.put('/:id', async (req, res) => {
  try {
    const data = req.body;
    const clinical_data = parseMaybeJSON(data.clinical_data, {});
    const medications   = parseMaybeJSON(data.medications, []);

    const pres = await Prescription.findByIdAndUpdate(
      req.params.id,
      {
        patient_name: data.patient_name,
        patient_mobile: data.patient_mobile,
        patient_age: data.patient_age,
        patient_gender: data.patient_gender,
        patient_address: data.patient_address,
        clinical_data,
        medications,
      },
      { new: true }
    );
    if (!pres) return res.status(404).json({ status: 'error', message: 'Prescription not found' });
    res.json({ status: 'success', prescription_id: pres._id, data: pres });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
