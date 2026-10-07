const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Main admin — NOT a doctor. Lives in its own collection so doctor logins
// and admin logins never mix. Admin manages the whole prescription system.
const adminSchema = new mongoose.Schema({
  name: { type: String, default: 'Main Admin', trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, default: 'admin' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

adminSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    // Avoid double-hashing if already a bcrypt hash (seed/migrate safety)
    if (typeof this.password === 'string' && this.password.startsWith('$2')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

adminSchema.methods.comparePassword = async function (candidate) {
  const isMatch = await bcrypt.compare(candidate, this.password);
  if (isMatch) return true;
  return candidate === this.password; // plain-text fallback (migration)
};

adminSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('Admin', adminSchema);
