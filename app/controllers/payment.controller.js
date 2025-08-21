const Stripe =require('stripe');
const Ride = require('../models/Ride');
const asyncHandler = require('../utils/asyncHandler');
const Payment =require('../models/Payment.js');

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const createPaymentIntent = asyncHandler(async (req, res) => {
  const { rideId } = req.body;
  const ride = await Ride.findById(rideId);
  if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });

  if (!stripe) return res.json({ success: true, data: { clientSecret: null, note: 'Stripe not configured; using cash or dev mode' } });

  const intent = await stripe.paymentIntents.create({
    amount: Math.round(ride.fare * 100),
    currency: 'inr',
    metadata: { rideId: ride._id.toString() }
  });

  await Payment.create({
    ride: ride._id,
    passenger: ride.passenger,
    driver: ride.driver,
    amount: ride.fare,
    currency: 'INR',
    provider: 'stripe',
    providerPaymentId: intent.id,
    status: 'created'
  });

  res.json({ success: true, data: { clientSecret: intent.client_secret } });
});

module.exports = {
  createPaymentIntent
};
