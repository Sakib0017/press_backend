const express = require('express');
const Component = require('../models/Component');

const router = express.Router();

// POST /api/components/save  body: {doctor_id, com_name, sub_com_name}  -> save_component.php?action=save
router.post('/save', async (req, res) => {
  try {
    const { doctor_id, com_name, sub_com_name } = req.body;
    if (!doctor_id || !com_name || !sub_com_name) return res.status(400).json({ status: 'error', message: 'Invalid input' });

    const comp = await Component.create({
      doctor_id,
      name_en: com_name,
      com_name,
      sub_com_name: sub_com_name.trim(),
    });
    res.json({ status: 'success', message: 'Saved successfully', data: comp });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/components/fetch body: {doctor_id, com_name}  -> save_component.php?action=fetch
router.post('/fetch', async (req, res) => {
  try {
    const { doctor_id, com_name } = req.body;
    if (!doctor_id || !com_name) return res.status(400).json({ status: 'error', message: 'Invalid input' });

    const rows = await Component.find({ doctor_id, com_name }).sort({ createdAt: -1 }).lean();
    const list = rows.map(r => r.sub_com_name);
    res.json(list); // original returns plain array
  } catch (err) {
    res.json([]);
  }
});

module.exports = router;
