const express = require('express');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { protectAdmin } = require('../middleware/adminAuth');

const router = express.Router();

const generateAdminToken = (id) =>
  jwt.sign({ id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/admin/auth/register — create an admin (non-doctor).
// First admin can be created openly (bootstrap). After at least one admin
// exists, a valid admin token is required to create more.
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ status: 'error', message: 'Email and password required' });

    const count = await Admin.countDocuments();
    if (count > 0) {
      // Require admin token for subsequent creates
      let token;
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
      }
      if (!token) return res.status(401).json({ status: 'error', message: 'Admin exists. Login as admin to create more.' });
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'admin') return res.status(403).json({ status: 'error', message: 'Admin only' });
        const me = await Admin.findById(decoded.id);
        if (!me) return res.status(401).json({ status: 'error', message: 'Admin not found' });
      } catch {
        return res.status(401).json({ status: 'error', message: 'Invalid admin token' });
      }
    }

    const exists = await Admin.findOne({ email: String(email).toLowerCase() });
    if (exists) return res.status(400).json({ status: 'error', message: 'Admin email already registered' });

    const admin = await Admin.create({
      name: name || 'Main Admin',
      email: String(email).toLowerCase(),
      password,
    });
    const token = generateAdminToken(admin._id);
    res.status(201).json({ status: 'success', token, admin: admin.toJSON() });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/admin/auth/login — main admin login (NOT a doctor login)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ status: 'error', message: 'Email and password required' });

    const admin = await Admin.findOne({ email: String(email).toLowerCase() });
    if (!admin) return res.status(401).json({ status: 'error', message: 'No admin account with that email. Run seed or POST /api/admin/auth/register once.' });

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) return res.status(401).json({ status: 'error', message: 'Invalid admin password.' });

    const token = generateAdminToken(admin._id);
    res.json({ status: 'success', token, admin: admin.toJSON() });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Admin authentication error' });
  }
});

// GET /api/admin/auth/me — current admin (requires admin token)
router.get('/me', protectAdmin, async (req, res) => {
  res.json({ status: 'success', data: req.admin });
});

module.exports = router;
