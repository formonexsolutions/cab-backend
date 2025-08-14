
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true, trim: true },
  role: { type: String, enum: ['passenger', 'driver', 'admin'], default: 'passenger' },
  documents: {
    license: String,
    policeVerification: String,
    carFront: String,
    carBack: String
  },
  isVerified: { type: Boolean, default: false },
  otp: String,
  otpExpiry: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
