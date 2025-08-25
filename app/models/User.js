const mongoose= require('mongoose');

const DriverSchema = new mongoose.Schema({
  verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  licenseNumber: String,
  vehicle: {
    brand: String,
    model: String,
    color: String,
    plate: String
  },
  documents: {
    license: String,
    policeVerification: String,
    carFront: String,
    carBack: String
  },
  kycStatus: { type: Boolean, default: false },
  status: { type: String, enum: ['offline', 'online', 'busy'], default: 'offline' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  locationUpdatedAt: { type: Date }
}, { _id: false });

DriverSchema.index({ location: '2dsphere' });

const UserSchema = new mongoose.Schema({
  role: { type: String, enum: ['passenger', 'driver', 'admin'], required: true },
  name: { type: String, required: true },
  email: { type: String, index: true, sparse: true },
  phone: { type: String, unique: true, sparse: true },
  avatarUrl: String,
  driver: DriverSchema
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);

