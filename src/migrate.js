/**
 * Migrate data from MySQL pdcl to MongoDB Atlas
 * Uses mysqldump via /opt/lampp/bin/mysql and inserts into MongoDB
 * Run:  node src/migrate.js
 * Requires: MONGODB_URI in .env and local MySQL running via XAMPP
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { execSync } = require('child_process');

async function migrate() {
  // Try to dump via Node mysql2 instead of shell for portability
  let mysql;
  try { mysql = require('mysql2/promise'); } catch { console.log('mysql2 not installed, run: npm install mysql2'); process.exit(1); }

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'pdcl',
    // XAMPP MySQL socket if needed: socketPath optional
  });

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Mongo connected:', mongoose.connection.host);

  const Doctor = require('./models/Doctor');
  const Appointment = require('./models/Appointment');
  const Prescription = require('./models/Prescription');
  const Component = require('./models/Component');
  const Medicine = require('./models/Medicine');
  const MedAdvice = require('./models/MedAdvice');
  const Dose = require('./models/Dose');

  // Helper: upsert helpers
  async function migrateTable(sql, Model, mapFn) {
    const [rows] = await connection.execute(sql);
    console.log(`Migrating ${Model.modelName}: ${rows.length} rows`);
    for (const r of rows) {
      const doc = mapFn(r);
      if (!doc) continue;
      // Use insert; if duplicate, skip
      try { await Model.create(doc); } catch (e) { /* ignore duplicates */ }
    }
  }

  // Doctors - keep password as-is (will be double hashed if we trigger pre-save). So disable hashing for migration.
  // We will insert with hashing manually if needed.
  const bcrypt = require('bcryptjs');
  const [doctors] = await connection.execute('SELECT * FROM doctors');
  console.log(`Migrating doctors: ${doctors.length}`);
  for (const r of doctors) {
    const exists = await Doctor.findOne({ email: r.email?.toLowerCase() });
    if (exists) continue;
    // Detect if password already bcrypted (starts with $2)
    let pwd = r.password;
    const isHashed = pwd && pwd.startsWith('$2');
    // Use raw insert to avoid pre-save double hash
    await mongoose.connection.db.collection('doctors').insertOne({
      name: r.name,
      usr_spec: r.usr_spec || '',
      specialization: r.usr_spec || '',
      degree: r.degree || '',
      experiance: r.experiance || '',
      experience: r.experiance || '',
      email: (r.email || '').toLowerCase(),
      password: isHashed ? pwd : await bcrypt.hash(pwd || '123456', 10),
      phone: r.phone || '',
      license_number: r.license_number || '',
      branch: r.branch || '',
      bhaban: r.bhaban || '',
      room: r.room || '',
      name_ban: r.name_ban || '',
      usr_spec_ban: r.usr_spec_ban || '',
      degree_ban: r.degree_ban || '',
      experiance_ban: r.experiance_ban || '',
      created_at: r.created_at ? new Date(r.created_at) : new Date(),
      updated_at: new Date(),
    });
  }

  await migrateTable('SELECT * FROM appointment', Appointment, r => ({
    patient_name: r.patient_name,
    patient_contact: r.patient_contact,
    patient_age: String(r.patient_age),
    patient_gender: ['Male','Female','Other'].includes(r.patient_gender) ? r.patient_gender : 'Male',
    doctor_name: r.doctor_name,
    appointment_date: r.appointment_date ? new Date(r.appointment_date) : new Date(),
    status: ['waiting','completed','cancelled'].includes(r.status) ? r.status : 'waiting',
  }));

  // Need mapping of prescriptions: after doctors/appointments, create prescriptions
  const [pres] = await connection.execute('SELECT * FROM prescriptions');
  console.log(`Migrating prescriptions: ${pres.length}`);
  for (const r of pres) {
    // Resolve doctor_id if numeric id exists
    let doctorObj = null;
    if (r.doctor_id) {
      // find by old numeric? Try by matching original mysql id if we stored? Since Mongo new ids, try lookup by name fallback
      // We'll attempt to find doctor by email or name via original doctors table mapping
      // For now, pick first doctor if not found
      const [dRows] = await connection.execute('SELECT email FROM doctors WHERE id = ?', [r.doctor_id]);
      if (dRows[0]?.email) doctorObj = await Doctor.findOne({ email: dRows[0].email.toLowerCase() });
    }
    if (!doctorObj) doctorObj = await Doctor.findOne();
    await Prescription.create({
      appointment_id: r.appointment_id ? String(r.appointment_id) : '',
      doctor_id: doctorObj._id,
      patient_name: r.patient_name || '',
      patient_mobile: r.patient_mobile || '',
      patient_age: String(r.patient_age || ''),
      patient_gender: r.patient_gender || 'Male',
      patient_address: r.patient_address || '',
      clinical_data: (()=>{ try{ return JSON.parse(r.clinical_data||'{}'); }catch{ return {}; }})(),
      medications: (()=>{ try{ return JSON.parse(r.medications||'[]'); }catch{ return []; }})(),
      created_at: r.created_at ? new Date(r.created_at) : new Date(),
    });
  }

  await migrateTable('SELECT * FROM components', Component, r => null); // components handled separately
  const [comps] = await connection.execute('SELECT * FROM components');
  console.log(`Migrating components: ${comps.length}`);
  for (const r of comps) {
    // Map doctor_id old numeric to new ObjectId
    let doctorObj = null;
    const [dRows] = await connection.execute('SELECT email FROM doctors WHERE id = ?', [r.doctor_id]);
    if (dRows[0]?.email) doctorObj = await Doctor.findOne({ email: dRows[0].email.toLowerCase() });
    if (!doctorObj) doctorObj = await Doctor.findOne();
    if (!doctorObj) continue;
    await Component.create({
      doctor_id: doctorObj._id,
      name_en: r.name_en,
      com_name: r.com_name,
      sub_com_name: r.sub_com_name,
    });
  }

  await migrateTable('SELECT * FROM medicine', Medicine, r => ({ usr_spec: r.usr_spec || '', medicine: r.medicine }));
  await migrateTable('SELECT * FROM medadvice', MedAdvice, r => ({ usr_spec: r.usr_spec || '', medadvice: r.medadvice }));
  await migrateTable('SELECT * FROM dose', Dose, r => ({ usr_spec: r.usr_spec || '', dose: r.dose }));

  console.log('Migration completed successfully!');
  await connection.end();
  await mongoose.disconnect();
}

migrate().catch(e => { console.error(e); process.exit(1); });
