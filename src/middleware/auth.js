const jwt = require('jsonwebtoken');
const Doctor = require('../models/Doctor');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ status: 'error', message: 'Not authorized, no token' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const doctor = await Doctor.findById(decoded.id).select('-password');
    if (!doctor) return res.status(401).json({ status: 'error', message: 'Doctor not found' });
    req.doctor = doctor;
    req.doctorId = doctor._id;
    next();
  } catch (err) {
    return res.status(401).json({ status: 'error', message: 'Not authorized, token failed' });
  }
};

// Optional auth - if token exists attach doctor, else continue as guest
const optionalAuth = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const doctor = await Doctor.findById(decoded.id).select('-password');
      if (doctor) { req.doctor = doctor; req.doctorId = doctor._id; }
    } catch {}
  }
  next();
};

module.exports = { protect, optionalAuth };
