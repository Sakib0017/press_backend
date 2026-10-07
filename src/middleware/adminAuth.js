const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Doctor = require('../models/Doctor');

// Admin-only guard. Token payload is { id, role: 'admin' }.
const protectAdmin = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ status: 'error', message: 'Not authorized, no admin token. Login at POST /api/admin/auth/login' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'Admin only. This token is not an admin token.' });
    }
    const admin = await Admin.findById(decoded.id).select('-password');
    if (!admin) return res.status(401).json({ status: 'error', message: 'Admin not found' });
    req.admin = admin;
    req.adminId = admin._id;
    next();
  } catch (err) {
    return res.status(401).json({ status: 'error', message: 'Not authorized, admin token failed' });
  }
};

// Allows EITHER a valid admin token OR a valid doctor token.
// Used for /api/admin/* so old doctor-based setups keep working after redeploy,
// while the new main-admin (non-doctor) is the recommended login.
const protectAdminOrDoctor = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ status: 'error', message: 'Not authorized, no token. Doctor: POST /api/auth/login | Admin: POST /api/admin/auth/login' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role === 'admin') {
      const admin = await Admin.findById(decoded.id).select('-password');
      if (!admin) return res.status(401).json({ status: 'error', message: 'Admin not found' });
      req.admin = admin;
      req.adminId = admin._id;
      req.role = 'admin';
      return next();
    }
    // Fallback: doctor token (payload { id } without role)
    const doctor = await Doctor.findById(decoded.id).select('-password');
    if (!doctor) return res.status(401).json({ status: 'error', message: 'Account not found (not admin, not doctor)' });
    req.doctor = doctor;
    req.doctorId = doctor._id;
    req.role = 'doctor';
    return next();
  } catch (err) {
    return res.status(401).json({ status: 'error', message: 'Not authorized, token failed' });
  }
};

module.exports = { protectAdmin, protectAdminOrDoctor };
