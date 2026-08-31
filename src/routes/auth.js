const express = require('express');
const jwt = require('jsonwebtoken');
const Doctor = require('../models/Doctor');

const router = express.Router();

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/register  -> signup.php
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, specialization, degree, experiance, experience, phone, license_number, branch, bhaban, room, usr_spec } = req.body;
    if (!name || !email || !password) return res.status(400).json({ status: 'error', message: 'Name, email and password required' });

    const exists = await Doctor.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ status: 'error', message: 'Email already registered' });

    const spec = specialization || usr_spec || '';
    const exp = experiance || experience || '';

    const doctor = await Doctor.create({
      name,
      email: email.toLowerCase(),
      password,
      usr_spec: spec,
      specialization: spec,
      degree: degree || '',
      experiance: exp,
      experience: exp,
      phone: phone || '',
      license_number: license_number || '',
      branch: branch || '',
      bhaban: bhaban || '',
      room: room || '',
    });

    const token = generateToken(doctor._id);
    res.status(201).json({ status: 'success', token, doctor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/auth/login -> index.php
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ status: 'error', message: 'Email and password required' });

    const doctor = await Doctor.findOne({ email: email.toLowerCase() });
    if (!doctor) return res.status(401).json({ status: 'error', message: 'No account found with that email address.' });

    const isMatch = await doctor.comparePassword(password);
    if (!isMatch) return res.status(401).json({ status: 'error', message: 'Invalid password.' });

    const token = generateToken(doctor._id);
    res.json({ status: 'success', token, doctor: doctor.toJSON() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Authentication error' });
  }
});

module.exports = router;
