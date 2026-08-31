const express = require('express');
const Doctor = require('../models/Doctor');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/doctors  - list all doctors ordered by name (used in dashboard grouping + patient_reg dropdown)
router.get('/', async (req, res) => {
  try {
    const doctors = await Doctor.find().select('-password').sort({ name: 1 });
    res.json({ status: 'success', data: doctors });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /api/doctors/me  - current logged in doctor (protect)
router.get('/me', protect, async (req, res) => {
  res.json({ status: 'success', data: req.doctor });
});

// GET /api/doctors/:id  - single doctor
router.get('/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).select('-password');
    if (!doctor) return res.status(404).json({ status: 'error', message: 'Doctor not found' });
    res.json({ status: 'success', data: doctor });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
