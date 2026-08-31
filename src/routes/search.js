const express = require('express');
const Medicine = require('../models/Medicine');
const MedAdvice = require('../models/MedAdvice');
const Dose = require('../models/Dose');

const router = express.Router();

// GET /api/search/medicine?q=&usr_spec=
router.get('/medicine', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const usr_spec = (req.query.usr_spec || '').trim();
    if (!q) return res.json({ ok: true, items: [] });

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const filter = { medicine: regex };
    // Filter: (usr_spec == ? OR ? == '') -> if usr_spec provided, allow matching spec OR empty spec rows? We'll implement includes.
    // Original: WHERE (usr_spec = ? OR ? = '') AND medicine LIKE ?
    // If usr_spec empty, show all. If provided, show rows where usr_spec matches or general empty?
    // We'll match if usr_spec matches or is empty-ish; for MERN we do broader search: if usr_spec, filter { $or: [{usr_spec}, {usr_spec: ''}] }
    let items;
    if (usr_spec) {
      items = await Medicine.find({ $and: [ { $or: [{ usr_spec }, { usr_spec: '' }] }, { medicine: regex } ] }).limit(20).lean();
    } else {
      items = await Medicine.find({ medicine: regex }).limit(20).lean();
    }
    res.json({ ok: true, items });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// GET /api/search/medadvice?q=&usr_spec=
router.get('/medadvice', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const usr_spec = (req.query.usr_spec || '').trim();
    if (!q) return res.json({ ok: true, items: [] });
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    let items;
    if (usr_spec) {
      items = await MedAdvice.find({ $and: [ { $or: [{ usr_spec }, { usr_spec: '' }] }, { medadvice: regex } ] }).limit(20).lean();
    } else {
      items = await MedAdvice.find({ medadvice: regex }).limit(20).lean();
    }
    res.json({ ok: true, items });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// GET /api/search/dose?q=&usr_spec=
router.get('/dose', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const usr_spec = (req.query.usr_spec || '').trim();
    if (!q) return res.json({ ok: true, items: [] });
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    let items;
    if (usr_spec) {
      items = await Dose.find({ $and: [ { $or: [{ usr_spec }, { usr_spec: '' }] }, { dose: regex } ] }).limit(20).lean();
    } else {
      items = await Dose.find({ dose: regex }).limit(20).lean();
    }
    res.json({ ok: true, items });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
