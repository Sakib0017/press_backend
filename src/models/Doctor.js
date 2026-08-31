const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  usr_spec: { type: String, default: '' }, // specialization alias from php (usr_spec)
  specialization: { type: String, default: '' }, // for signup compatibility
  degree: { type: String, default: '' },
  experiance: { type: String, default: '' }, // keep typo for backward compat
  experience: { type: String, default: '' },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phone: { type: String, default: '' },
  license_number: { type: String, default: '' },
  branch: { type: String, default: '' },
  bhaban: { type: String, default: '' },
  room: { type: String, default: '' },
  name_ban: { type: String, default: '' },
  usr_spec_ban: { type: String, default: '' },
  degree_ban: { type: String, default: '' },
  experiance_ban: { type: String, default: '' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Normalize specialization field: if specialization provided use it as usr_spec
doctorSchema.pre('save', async function (next) {
  if (this.isModified('specialization') && this.specialization && !this.usr_spec) {
    this.usr_spec = this.specialization;
  }
  if (this.isModified('usr_spec') && this.usr_spec && !this.specialization) {
    this.specialization = this.usr_spec;
  }
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

doctorSchema.methods.comparePassword = async function (candidate) {
  // Allow plain text fallback like PHP did (password_verify OR === )
  // But bcrypt compare is preferred
  const isMatch = await bcrypt.compare(candidate, this.password);
  if (isMatch) return true;
  // fallback: direct compare if stored password was plain (migration case)
  return candidate === this.password;
};

doctorSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('Doctor', doctorSchema);
