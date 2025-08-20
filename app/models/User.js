const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  role: { type: String, enum: ['passenger', 'driver', 'admin'], required: true },
  isVerified: { type: Boolean, default: false },
  documents: {
    license: String,
    policeVerification: String,
    carFront: String,
    carBack: String
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  }
}, { timestamps: true });

// Create 2dsphere index for geospatial queries
UserSchema.index({ location: "2dsphere" });

module.exports = mongoose.model('User', UserSchema);
