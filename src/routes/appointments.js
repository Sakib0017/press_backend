const express = require('express');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/appointments?doctor_name=&from_date=&to_date=&status=  (patient_list.php, appointment queue)
router.get('/', async (req, res) => {
  try {
    const { doctor_name, from_date, to_date, status, doctor_id } = req.query;
    const filter = {};

    if (doctor_name) filter.doctor_name = doctor_name;
    if (doctor_id) {
      const doc = await Doctor.findById(doctor_id);
      if (doc) filter.doctor_name = doc.name;
    }
    if (status) filter.status = status;

    if (from_date && to_date) {
      const from = new Date(from_date);
      from.setHours(0,0,0,0);
      const to = new Date(to_date);
      to.setHours(23,59,59,999);
      filter.appointment_date = { $gte: from, $lte: to };
    } else if (from_date) {
      const from = new Date(from_date);
      from.setHours(0,0,0,0);
      const to = new Date(from_date);
      to.setHours(23,59,59,999);
      filter.appointment_date = { $gte: from, $lte: to };
    }

    const appointments = await Appointment.find(filter).sort({ appointment_date: -1 }).lean();
    // add appointment_id alias like PHP
    const mapped = appointments.map(a => ({ ...a, appointment_id: a._id }));
    res.json({ status: 'success', data: mapped });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /api/appointments/queue?doctorId=&doctorName= -> waiting + completed split (prescription.php queue)
router.get('/queue/list', async (req, res) => {
  try {
    const { doctorName, doctorId } = req.query;
    let dName = doctorName;
    if (doctorId && !dName) {
      const doc = await Doctor.findById(doctorId);
      if (doc) dName = doc.name;
    }
    if (!dName) return res.status(400).json({ status: 'error', message: 'doctorName or doctorId required' });

    const waiting = await Appointment.find({ doctor_name: { $regex: dName, $options: 'i' }, status: { $in: ['waiting', null] } }).sort({ appointment_date: -1 }).lean();
    const completed = await Appointment.find({ doctor_name: { $regex: dName, $options: 'i' }, status: 'completed' }).sort({ appointment_date: -1 }).lean();

    // Enrich completed with prescription id if exists (handled separately but we can attempt)
    res.json({
      status: 'success',
      waiting: waiting.map(a => ({ ...a, appointment_id: a._id })),
      completed: completed.map(a => ({ ...a, appointment_id: a._id })),
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/appointments  -> patient_reg.php
router.post('/', async (req, res) => {
  try {
    const { patient_name, patient_contact, patient_age, patient_gender, doctor_name, appointment_date, status, doctor_id } = req.body;
    if (!patient_name || !patient_contact || !patient_age || !patient_gender || !doctor_name || !appointment_date) {
      return res.status(400).json({ status: 'error', message: 'All fields are required' });
    }
    let docName = doctor_name;
    let docRef = doctor_id || null;
    // if doctor_id provided, fetch name for denormalization
    if (doctor_id) {
      const d = await Doctor.findById(doctor_id);
      if (d) { docName = d.name; docRef = d._id; }
    }

    const appt = await Appointment.create({
      patient_name, patient_contact, patient_age, patient_gender,
      doctor_name: docName,
      doctor: docRef,
      appointment_date: new Date(appointment_date),
      status: status || 'waiting',
    });
    res.status(201).json({ status: 'success', data: { ...appt.toObject(), appointment_id: appt._id } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// PUT /api/appointments/:id/status  -> update_appointment.php  (waiting/completed/cancelled)
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['waiting', 'completed', 'cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ status: 'error', message: 'Invalid status' });
    const appt = await Appointment.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!appt) return res.status(404).json({ status: 'error', message: 'Appointment not found' });
    res.json({ status: 'success', data: appt });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/appointments/:id/complete  -> complete_appointment.php
router.post('/:id/complete', async (req, res) => {
  try {
    if (req.params.id === 'WALK-IN') return res.json({ status: 'skipped', message: 'No valid appointment ID' });
    const appt = await Appointment.findByIdAndUpdate(req.params.id, { status: 'completed' }, { new: true });
    if (!appt) return res.status(404).json({ status: 'error', message: 'Appointment not found' });
    res.json({ status: 'success', data: appt });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
