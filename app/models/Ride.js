const mongoose = require('mongoose');

const PointSchema = new mongoose.Schema({
  type: { type: String, enum: ['Point'], default: 'Point' },
  coordinates: { type: [Number], required: true } // [lng, lat]
}, { _id: false });

const RideSchema = new mongoose.Schema({
  passenger: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  pickup: {
    address: String,
    location: { type: PointSchema, required: true }
  },
  dropoff: {
    address: String,
    location: { type: PointSchema, required: true }
  },
  status: { 
    type: String, 
    enum: ['requested', 'assigned', 'accepted', 'arriving', 'started', 'completed', 'cancelled'],
    default: 'requested'
  },
  fare: { type: Number, default: 0 },
  surgeMultiplier: { type: Number, default: 1 },
  paymentMethod: { type: String, enum: ['cash', 'card', 'wallet'], default: 'cash' },
   // ...existing fields
  startOtp: { type: String },
  otpExpiry: { type: Date },
  distanceKm: Number,
  durationMin: Number,
  meta: Object
}, { timestamps: true });

RideSchema.index({ 'pickup.location': '2dsphere' });
RideSchema.index({ 'dropoff.location': '2dsphere' });

module.exports = mongoose.model('Ride', RideSchema);
