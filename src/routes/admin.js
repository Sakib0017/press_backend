const express = require('express');
const Doctor = require('../models/Doctor');
const Admin = require('../models/Admin');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const Component = require('../models/Component');
const Medicine = require('../models/Medicine');
const MedAdvice = require('../models/MedAdvice');
const Dose = require('../models/Dose');
// Main admin is NOT a doctor. Accept either admin token (recommended) or
// legacy doctor token so old setups keep working after redeploy.
const { protectAdminOrDoctor } = require('../middleware/adminAuth');

const router = express.Router();
router.use(protectAdminOrDoctor);

function parseMaybeJSON(v, fallback) {
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { return fallback; }
  }
  return v ?? fallback;
}

// Only main admin (role=admin) can manage other admins
function requireAdmin(req, res, next) {
  if (req.role !== 'admin') {
    return res.status(403).json({ status: 'error', message: 'Main admin only. Login at POST /api/admin/auth/login' });
  }
  next();
}

// GET /api/admin/stats -> counts for every collection + today counts
router.get('/stats', async (req, res) => {
  try {
    const [doctors, admins, appointments, prescriptions, components, medicines, medAdvices, doses] = await Promise.all([
      Doctor.countDocuments(),
      Admin.countDocuments(),
      Appointment.countDocuments(),
      Prescription.countDocuments(),
      Component.countDocuments(),
      Medicine.countDocuments(),
      MedAdvice.countDocuments(),
      Dose.countDocuments(),
    ]);
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const [apptToday, presToday] = await Promise.all([
      Appointment.countDocuments({ created_at: { $gte: start } }),
      Prescription.countDocuments({ created_at: { $gte: start } }),
    ]);
    const waiting = await Appointment.countDocuments({ status: 'waiting' });
    const completed = await Appointment.countDocuments({ status: 'completed' });
    const cancelled = await Appointment.countDocuments({ status: 'cancelled' });
    res.json({ status: 'success', data: { doctors, admins, appointments, prescriptions, components, medicines, medAdvices, doses, apptToday, presToday, waiting, completed, cancelled } });
  } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});

// ---------- Admins (main admins, NOT doctors) ----------
router.get('/admins', requireAdmin, async (req, res) => {
  try {
    const list = await Admin.find().select('-password').sort({ created_at: -1 }).lean();
    res.json({ status: 'success', data: list });
  } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});
router.post('/admins', requireAdmin, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ status: 'error', message: 'Email and password required' });
    const exists = await Admin.findOne({ email: String(email).toLowerCase() });
    if (exists) return res.status(400).json({ status: 'error', message: 'Admin email already registered' });
    const admin = await Admin.create({ name: name || 'Main Admin', email: String(email).toLowerCase(), password });
    res.status(201).json({ status: 'success', data: admin.toJSON() });
  } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});
router.put('/admins/:id', requireAdmin, async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ status: 'error', message: 'Admin not found' });
    if (req.body.name !== undefined) admin.name = req.body.name;
    if (req.body.email !== undefined) admin.email = String(req.body.email).toLowerCase();
    if (req.body.password) admin.password = req.body.password;
    await admin.save();
    res.json({ status: 'success', data: admin.toJSON() });
  } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});
router.delete('/admins/:id', requireAdmin, async (req, res) => {
  try {
    const count = await Admin.countDocuments();
    if (count <= 1) return res.status(400).json({ status: 'error', message: 'Cannot delete the last admin' });
    const admin = await Admin.findByIdAndDelete(req.params.id);
    if (!admin) return res.status(404).json({ status: 'error', message: 'Admin not found' });
    res.json({ status: 'success', message: 'Admin deleted' });
  } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});

// ---------- Doctors ----------
router.get('/doctors', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const filter = q ? { $or: [{ name: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } }, { usr_spec: { $regex: q, $options: 'i' } }, { specialization: { $regex: q, $options: 'i' } }] } : {};
    const doctors = await Doctor.find(filter).select('-password').sort({ name: 1 }).limit(200).lean();
    res.json({ status: 'success', data: doctors });
  } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});
router.post('/doctors', async (req, res) => {
  try {
    const { name, email, password, usr_spec, specialization, degree, experiance, experience, phone, license_number, branch, bhaban, room, name_ban, usr_spec_ban, degree_ban, experiance_ban } = req.body;
    if (!name || !email || !password) return res.status(400).json({ status: 'error', message: 'Name, email, password required' });
    const exists = await Doctor.findOne({ email: String(email).toLowerCase() });
    if (exists) return res.status(400).json({ status: 'error', message: 'Email already registered' });
    const spec = specialization || usr_spec || '';
    const exp = experiance || experience || '';
    const doc = await Doctor.create({ name, email: String(email).toLowerCase(), password, usr_spec: spec, specialization: spec, degree: degree || '', experiance: exp, experience: exp, phone: phone || '', license_number: license_number || '', branch: branch || '', bhaban: bhaban || '', room: room || '', name_ban: name_ban || '', usr_spec_ban: usr_spec_ban || '', degree_ban: degree_ban || '', experiance_ban: experiance_ban || '' });
    res.status(201).json({ status: 'success', data: doc.toJSON() });
  } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});
router.put('/doctors/:id', async (req, res) => {
  try {
    const doc = await Doctor.findById(req.params.id);
    if (!doc) return res.status(404).json({ status: 'error', message: 'Doctor not found' });
    const fields = ['name', 'email', 'usr_spec', 'specialization', 'degree', 'experiance', 'experience', 'phone', 'license_number', 'branch', 'bhaban', 'room', 'name_ban', 'usr_spec_ban', 'degree_ban', 'experiance_ban'];
    fields.forEach(f => { if (req.body[f] !== undefined) doc[f] = req.body[f]; });
    if (req.body.password) doc.password = req.body.password;
    await doc.save();
    res.json({ status: 'success', data: doc.toJSON() });
  } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});
router.delete('/doctors/:id', async (req, res) => {
  try {
    const doc = await Doctor.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ status: 'error', message: 'Doctor not found' });
    res.json({ status: 'success', message: 'Doctor deleted' });
  } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});

// ---------- Appointments (full CRUD for admin) ----------
router.get('/appointments', async (req, res) => {
  try {
    const { q, status, doctor_name } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (doctor_name) filter.doctor_name = { $regex: doctor_name, $options: 'i' };
    if (q) filter.$or = [{ patient_name: { $regex: q, $options: 'i' } }, { patient_contact: { $regex: q, $options: 'i' } }, { doctor_name: { $regex: q, $options: 'i' } }];
    const list = await Appointment.find(filter).sort({ appointment_date: -1 }).limit(200).lean();
    res.json({ status: 'success', data: list });
  } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});
router.post('/appointments', async (req, res) => {
  try {
    const { patient_name, patient_contact, patient_age, patient_gender, doctor_name, doctor_id, appointment_date, status } = req.body;
    if (!patient_name || !patient_contact || !patient_age || !patient_gender || !doctor_name || !appointment_date) {
      return res.status(400).json({ status: 'error', message: 'patient_name, patient_contact, patient_age, patient_gender, doctor_name, appointment_date required' });
    }
    let doctorRef = doctor_id || null;
    let finalDoctorName = doctor_name;
    if (doctor_id) {
      const d = await Doctor.findById(doctor_id).lean();
      if (d) { doctorRef = d._id; finalDoctorName = d.name; }
    }
    const appt = await Appointment.create({
      patient_name, patient_contact, patient_age, patient_gender,
      doctor_name: finalDoctorName, doctor: doctorRef,
      appointment_date: new Date(appointment_date), status: status || 'waiting',
    });
    res.status(201).json({ status: 'success', data: appt });
  } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});
router.put('/appointments/:id', async (req, res) => {
  try {
    const appt = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!appt) return res.status(404).json({ status: 'error', message: 'Appointment not found' });
    res.json({ status: 'success', data: appt });
  } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});
router.delete('/appointments/:id', async (req, res) => {
  try {
    const appt = await Appointment.findByIdAndDelete(req.params.id);
    if (!appt) return res.status(404).json({ status: 'error', message: 'Appointment not found' });
    res.json({ status: 'success', message: 'Appointment deleted' });
  } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});

// ---------- Prescriptions (full CRUD for admin) ----------
router.get('/prescriptions', async (req, res) => {
  try {
    const { q, doctor_id } = req.query;
    const filter = {};
    if (doctor_id) filter.doctor_id = doctor_id;
    if (q) filter.$or = [{ patient_name: { $regex: q, $options: 'i' } }, { patient_mobile: { $regex: q, $options: 'i' } }];
    const list = await Prescription.find(filter).populate('doctor_id', 'name usr_spec').sort({ created_at: -1 }).limit(200).lean();
    res.json({ status: 'success', data: list });
  } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});
router.get('/prescriptions/:id', async (req, res) => {
  try {
    const pres = await Prescription.findById(req.params.id).populate('doctor_id').lean();
    if (!pres) return res.status(404).json({ status: 'error', message: 'Prescription not found' });
    let appointment = null;
    if (pres.appointment) appointment = await Appointment.findById(pres.appointment).lean();
    res.json({ status: 'success', data: { ...pres, id: pres._id, doctor: pres.doctor_id, appointment } });
  } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});
router.post('/prescriptions', async (req, res) => {
  try {
    const data = req.body;
    if (!data.doctor_id || !data.patient_name || !data.patient_mobile || !data.patient_age || !data.patient_gender) {
      return res.status(400).json({ status: 'error', message: 'doctor_id, patient_name, patient_mobile, patient_age, patient_gender required' });
    }
    const pres = await Prescription.create({
      appointment_id: data.appointment_id || '',
      appointment: data.appointment_id && data.appointment_id !== 'WALK-IN' ? data.appointment_id : null,
      doctor_id: data.doctor_id,
      patient_name: data.patient_name,
      patient_mobile: data.patient_mobile,
      patient_age: data.patient_age,
      patient_gender: data.patient_gender,
      patient_address: data.patient_address || '',
      clinical_data: parseMaybeJSON(data.clinical_data, {}),
      medications: parseMaybeJSON(data.medications, []),
    });
    res.status(201).json({ status: 'success', prescription_id: pres._id, data: pres });
  } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});
router.put('/prescriptions/:id', async (req, res) => {
  try {
    const data = req.body;
    const update = {};
    ['appointment_id', 'doctor_id', 'patient_name', 'patient_mobile', 'patient_age', 'patient_gender', 'patient_address'].forEach(f => {
      if (data[f] !== undefined) update[f] = data[f];
    });
    if (data.clinical_data !== undefined) update.clinical_data = parseMaybeJSON(data.clinical_data, {});
    if (data.medications !== undefined) update.medications = parseMaybeJSON(data.medications, []);
    if (update.appointment_id && update.appointment_id !== 'WALK-IN') update.appointment = update.appointment_id;
    if (update.appointment_id === 'WALK-IN') update.appointment = null;
    const pres = await Prescription.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!pres) return res.status(404).json({ status: 'error', message: 'Prescription not found' });
    res.json({ status: 'success', prescription_id: pres._id, data: pres });
  } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});
router.delete('/prescriptions/:id', async (req, res) => {
  try {
    const pres = await Prescription.findByIdAndDelete(req.params.id);
    if (!pres) return res.status(404).json({ status: 'error', message: 'Prescription not found' });
    res.json({ status: 'success', message: 'Prescription deleted' });
  } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});

// ---------- Components (full CRUD for admin) ----------
router.get('/components', async (req, res) => {
  try {
    const { doctor_id, com_name, q } = req.query;
    const filter = {};
    if (doctor_id) filter.doctor_id = doctor_id;
    if (com_name) filter.com_name = com_name;
    if (q) filter.sub_com_name = { $regex: q, $options: 'i' };
    const list = await Component.find(filter).populate('doctor_id', 'name').sort({ createdAt: -1 }).limit(300).lean();
    res.json({ status: 'success', data: list });
  } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});
router.post('/components', async (req, res) => {
  try {
    const { doctor_id, com_name, sub_com_name, name_en } = req.body;
    if (!doctor_id || !com_name || !sub_com_name) return res.status(400).json({ status: 'error', message: 'doctor_id, com_name, sub_com_name required' });
    const c = await Component.create({ doctor_id, name_en: name_en || com_name, com_name, sub_com_name: String(sub_com_name).trim() });
    res.status(201).json({ status: 'success', data: c });
  } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});
router.put('/components/:id', async (req, res) => {
  try {
    const c = await Component.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!c) return res.status(404).json({ status: 'error', message: 'Component not found' });
    res.json({ status: 'success', data: c });
  } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});
router.delete('/components/:id', async (req, res) => {
  try {
    const c = await Component.findByIdAndDelete(req.params.id);
    if (!c) return res.status(404).json({ status: 'error', message: 'Component not found' });
    res.json({ status: 'success', message: 'Component deleted' });
  } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});

// ---------- Generic library CRUD: medicines / medadvice / doses ----------
function libraryRoutes(Model, field) {
  const r = express.Router({ mergeParams: true });
  r.get('/', async (req, res) => {
    try {
      const { q, usr_spec } = req.query;
      const filter = {};
      if (usr_spec) filter.usr_spec = usr_spec;
      if (q) filter[field] = { $regex: q, $options: 'i' };
      const list = await Model.find(filter).sort({ [field]: 1 }).limit(300).lean();
      res.json({ status: 'success', data: list });
    } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
  });
  r.post('/', async (req, res) => {
    try {
      if (!req.body[field]) return res.status(400).json({ status: 'error', message: `${field} required` });
      const item = await Model.create({ [field]: req.body[field], usr_spec: req.body.usr_spec || '' });
      res.status(201).json({ status: 'success', data: item });
    } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
  });
  r.put('/:id', async (req, res) => {
    try {
      const item = await Model.findByIdAndUpdate(req.params.id, { [field]: req.body[field], usr_spec: req.body.usr_spec }, { new: true });
      if (!item) return res.status(404).json({ status: 'error', message: 'Not found' });
      res.json({ status: 'success', data: item });
    } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
  });
  r.delete('/:id', async (req, res) => {
    try {
      const item = await Model.findByIdAndDelete(req.params.id);
      if (!item) return res.status(404).json({ status: 'error', message: 'Not found' });
      res.json({ status: 'success', message: 'Deleted' });
    } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
  });
  return r;
}
router.use('/medicines', libraryRoutes(Medicine, 'medicine'));
router.use('/medadvice', libraryRoutes(MedAdvice, 'medadvice'));
router.use('/doses', libraryRoutes(Dose, 'dose'));

module.exports = router;
