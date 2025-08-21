const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  ride: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true },
  passenger: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  provider: { type: String, enum: ['stripe', 'razorpay', 'cash'], default: 'cash' },
  providerPaymentId: String,
  status: { type: String, enum: ['created', 'paid', 'failed', 'refunded'], default: 'created' },
  meta: Object
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);
