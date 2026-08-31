require('dotenv').config();
const mongoose = require('mongoose');
const Doctor = require('./models/Doctor');
const Medicine = require('./models/Medicine');
const MedAdvice = require('./models/MedAdvice');
const Dose = require('./models/Dose');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to', mongoose.connection.host);

  // Seed sample doctor if none
  const count = await Doctor.countDocuments();
  if (count === 0) {
    const bcrypt = require('bcryptjs');
    await Doctor.create({
      name: 'Tanbin Rahman',
      email: 'tanbin@press.com',
      password: '123456', // will be hashed by pre-save
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
    console.log('Seeded default doctor: tanbin@press.com / 123456');
  } else console.log(`Doctors already exist: ${count}`);

  if ((await Medicine.countDocuments()) === 0) {
    await Medicine.insertMany([
      { usr_spec: 'Medicine', medicine: 'Napa 500mg' },
      { usr_spec: 'Medicine', medicine: 'Ace 500mg' },
      { usr_spec: 'Medicine', medicine: 'Seclo 20mg' },
      { usr_spec: '', medicine: 'Paracetamol 500mg' },
    ]);
    console.log('Seeded medicines');
  }
  if ((await MedAdvice.countDocuments()) === 0) {
    await MedAdvice.insertMany([
      { usr_spec: 'Medicine', medadvice: 'After meal' },
      { usr_spec: 'Medicine', medadvice: 'Before meal' },
      { usr_spec: '', medadvice: 'With water' },
    ]);
    console.log('Seeded medadvice');
  }
  if ((await Dose.countDocuments()) === 0) {
    await Dose.insertMany([
      { usr_spec: 'Medicine', dose: '1+0+1' },
      { usr_spec: 'Medicine', dose: '0+1+0' },
      { usr_spec: 'Medicine', dose: '1+1+1' },
      { usr_spec: '', dose: '1+0+0' },
    ]);
    console.log('Seeded doses');
  }

  await mongoose.disconnect();
  console.log('Seed done');
}

seed().catch(e => { console.error(e); process.exit(1); });
