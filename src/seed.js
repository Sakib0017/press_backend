require('dotenv').config();
const mongoose = require('mongoose');
const Doctor = require('./models/Doctor');
const Medicine = require('./models/Medicine');
const MedAdvice = require('./models/MedAdvice');
const Dose = require('./models/Dose');
const Appointment = require('./models/Appointment');
const Prescription = require('./models/Prescription');
const Component = require('./models/Component');

async function seed() {
  // Auto-fix unencoded password if present (same as db.js)
  let uri = process.env.MONGODB_URI;
  if (uri && uri.includes('Skb@12400@Kml')) {
    uri = uri.replaceAll('Skb@12400@Kml', 'Skb%4012400%40Kml');
    console.log('Auto-fixed MONGODB_URI password encoding (Skb@12400@Kml -> Skb%4012400%40Kml)');
  }
  await mongoose.connect(uri);
  const dbName = mongoose.connection.name;
  console.log(`Connected to ${mongoose.connection.host} / DB: ${dbName}`);
  if (dbName !== 'pdcl') console.warn(`WARNING: Connected DB is ${dbName}, expected pdcl. Check URI path /pdcl?`);
  else console.log('Database pdcl verified ✓');

  // Seed doctors
  let tanbin = await Doctor.findOne({ email: 'tanbin@press.com' });
  if (!tanbin) {
    tanbin = await Doctor.create({
      name: 'Tanbin Rahman',
      email: 'tanbin@press.com',
      password: '123456',
      usr_spec: 'Medicine',
      specialization: 'Medicine',
      degree: 'MBBS, FCPS',
      experiance: '10 Years',
      phone: '01700000000',
      license_number: 'BMDC-12345',
      branch: 'Dhanmondi',
      bhaban: 'Popular Diagnostic',
      room: '101',
      name_ban: 'তানবিন রহমান',
      usr_spec_ban: 'মেডিসিন',
      degree_ban: 'এমবিবিএস, এফসিপিএস',
      experiance_ban: '১০ বছর',
    });
    console.log('Seeded doctor: tanbin@press.com / 123456');
  } else console.log(`Doctor exists: ${tanbin.email}`);

  // Seed second doctor for multi-doctor testing
  let sakib = await Doctor.findOne({ email: 'sakib.admin@press.com' });
  if (!sakib) {
    sakib = await Doctor.create({
      name: 'Sakib Admin',
      email: 'sakib.admin@press.com',
      password: 'Skb@12400@Kml',
      usr_spec: 'Cardiology',
      specialization: 'Cardiology',
      degree: 'MBBS, MD (Cardiology)',
      experiance: '8 Years',
      phone: '01800000000',
      license_number: 'BMDC-99999',
      branch: 'Gulshan',
      bhaban: 'Homecare Tower',
      room: '205',
    });
    console.log('Seeded doctor: sakib.admin@press.com / Skb@12400@Kml ( Atlas user )');
  }

  // Medicines
  if ((await Medicine.countDocuments()) === 0) {
    await Medicine.insertMany([
      { usr_spec: 'Medicine', medicine: 'Napa 500mg' },
      { usr_spec: 'Medicine', medicine: 'Ace 500mg' },
      { usr_spec: 'Medicine', medicine: 'Seclo 20mg' },
      { usr_spec: 'Cardiology', medicine: 'Aspirin 75mg' },
      { usr_spec: '', medicine: 'Paracetamol 500mg' },
      { usr_spec: '', medicine: 'Omeprazole 20mg' },
    ]);
    console.log('Seeded medicines (6)');
  }
  if ((await MedAdvice.countDocuments()) === 0) {
    await MedAdvice.insertMany([
      { usr_spec: 'Medicine', medadvice: 'After meal' },
      { usr_spec: 'Medicine', medadvice: 'Before meal' },
      { usr_spec: 'Cardiology', medadvice: 'After breakfast' },
      { usr_spec: '', medadvice: 'With water' },
    ]);
    console.log('Seeded medadvice (4)');
  }
  if ((await Dose.countDocuments()) === 0) {
    await Dose.insertMany([
      { usr_spec: 'Medicine', dose: '1+0+1' },
      { usr_spec: 'Medicine', dose: '0+1+0' },
      { usr_spec: 'Medicine', dose: '1+1+1' },
      { usr_spec: '', dose: '1+0+0' },
      { usr_spec: '', dose: '0+0+1' },
    ]);
    console.log('Seeded doses (5)');
  }

  // Components sample per doctor
  if ((await Component.countDocuments({ doctor_id: tanbin._id })) === 0) {
    await Component.insertMany([
      { doctor_id: tanbin._id, name_en: 'complaints', com_name: 'complaints', sub_com_name: 'Fever' },
      { doctor_id: tanbin._id, name_en: 'complaints', com_name: 'complaints', sub_com_name: 'Headache' },
      { doctor_id: tanbin._id, name_en: 'diagnosis', com_name: 'diagnosis', sub_com_name: 'Viral Fever' },
      { doctor_id: tanbin._id, name_en: 'history', com_name: 'history', sub_com_name: 'Hypertension' },
    ]);
    console.log('Seeded components for Tanbin (4)');
  }

  // Sample appointments
  if ((await Appointment.countDocuments()) === 0) {
    const appt1 = await Appointment.create({
      patient_name: 'Abdul Karim',
      patient_contact: '01711111111',
      patient_age: '35',
      patient_gender: 'Male',
      doctor_name: 'Tanbin Rahman',
      doctor: tanbin._id,
      appointment_date: new Date(),
      status: 'waiting',
    });
    const appt2 = await Appointment.create({
      patient_name: 'Fatima Begum',
      patient_contact: '01822222222',
      patient_age: '28',
      patient_gender: 'Female',
      doctor_name: 'Tanbin Rahman',
      doctor: tanbin._id,
      appointment_date: new Date(Date.now() - 86400000),
      status: 'completed',
    });
    console.log(`Seeded appointments (2): ${appt1._id}, ${appt2._id}`);

    // Sample prescription for completed appt
    if ((await Prescription.countDocuments()) === 0) {
      await Prescription.create({
        appointment_id: String(appt2._id),
        appointment: appt2._id,
        doctor_id: tanbin._id,
        patient_name: 'Fatima Begum',
        patient_mobile: '01822222222',
        patient_age: '28',
        patient_gender: 'Female',
        patient_address: 'Dhanmondi, Dhaka',
        clinical_data: { complaints: ['Fever', 'Headache'], diagnosis: ['Viral Fever'], history: ['Hypertension'] },
        medications: [{ name: 'Napa 500mg', instruction: 'After meal', dose: '1+0+1', duration: '5 Days' }],
      });
      console.log('Seeded sample prescription (1)');
    }
  } else console.log(`Appointments already exist: ${await Appointment.countDocuments()}`);

  console.log(`\n=== SEED SUMMARY (DB: ${dbName}) ===`);
  console.log(`Doctors: ${await Doctor.countDocuments()}`);
  console.log(`Medicines: ${await Medicine.countDocuments()}`);
  console.log(`MedAdvices: ${await MedAdvice.countDocuments()}`);
  console.log(`Doses: ${await Dose.countDocuments()}`);
  console.log(`Appointments: ${await Appointment.countDocuments()}`);
  console.log(`Prescriptions: ${await Prescription.countDocuments()}`);
  console.log(`Components: ${await Component.countDocuments()}`);

  await mongoose.disconnect();
  console.log('Seed done ✓ - Data ready in Atlas pdcl');
}

seed().catch(e => { console.error(e); process.exit(1); });
