const  StatusCodes= require('http-status-codes');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { calculateFare } = require('../services/fare.service');
const Ride = require('../models/Ride');
const Rating = require('../models/Rating');
const { findNearestDriver } = require('../services/rideMatching.service');
const { notifyUser } = require('../services/notification.service');



const nearbyDrivers = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 0.1 } = req.query; // radius in km (0.1km = 100m)
  if (!lat || !lng) return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'lat/lng required' });

  const drivers = await User.find({
    role: 'driver',
    'driver.status': 'online',
    'driver.verificationStatus': 'verified',
    'driver.location': {
      $near: {
        $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
        $maxDistance: Number(radius) * 1000
      }
    }
  }).select('_id name driver.vehicle driver.location');

  res.json({ success: true, data: drivers });
});

const requestRide = asyncHandler(async (req, res) => {
  const { pickup, dropoff, distanceKm = 2.5, durationMin = 10, surgeMultiplier = 1, paymentMethod = 'cash' } = req.body;

  if (!pickup?.location?.coordinates || !dropoff?.location?.coordinates)
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'pickup/dropoff required' });

  const fare = calculateFare({ distanceKm, durationMin, surgeMultiplier });

  const ride = await Ride.create({
    passenger: req.user._id,
    pickup,
    dropoff,
    distanceKm,
    durationMin,
    surgeMultiplier,
    fare,
    paymentMethod,
    status: 'requested'
  });

  // assign nearest driver
  const [lng, lat] = pickup.location.coordinates;
  const driver = await findNearestDriver({ lng, lat, radiusMeters: 200 }); // start with 200m
  if (driver) {
    ride.driver = driver._id;
    ride.status = 'assigned';
    await ride.save();
    notifyUser(driver._id, { type: 'NEW_RIDE', rideId: ride._id.toString() });
  }
// notify the driver & passenger
      emitToUser(driver._id.toString(), 'ride:new', { rideId: ride._id.toString() });
      emitToUser(req.user._id.toString(), 'ride:update', { rideId: ride._id.toString(), status: 'assigned', driver });
  res.status(StatusCodes.CREATED).json({ success: true, data: ride });
});

const rideDetails = asyncHandler(async (req, res) => {
  const ride = await Ride.findById(req.params.id).populate('passenger', 'name phone').populate('driver', 'name phone driver.vehicle driver.location');
  if (!ride) return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Ride not found' });
  if (ride.passenger.toString?.() !== req.user._id.toString() && ride.passenger._id?.toString() !== req.user._id.toString())
    return res.status(StatusCodes.FORBIDDEN).json({ success: false, message: 'Forbidden' });
  res.json({ success: true, data: ride });
});

const cancelRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findById(req.params.id);
  if (!ride) return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Ride not found' });
  if (ride.passenger.toString() !== req.user._id.toString())
    return res.status(StatusCodes.FORBIDDEN).json({ success: false, message: 'Forbidden' });
  if (['started', 'completed'].includes(ride.status))
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Cannot cancel' });

  ride.status = 'cancelled';
  await ride.save();

  if (ride.driver) notifyUser(ride.driver, { type: 'RIDE_CANCELLED', rideId: ride._id.toString() });
  res.json({ success: true, data: ride });
});

const myRides = asyncHandler(async (req, res) => {
  const rides = await Ride.find({ passenger: req.user._id }).sort('-createdAt');
  res.json({ success: true, data: rides });
});

const rateDriver = asyncHandler(async (req, res) => {
  const { rideId, stars, comment } = req.body;
  const ride = await Ride.findById(rideId);
  if (!ride) return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Ride not found' });
  if (ride.passenger.toString() !== req.user._id.toString())
    return res.status(StatusCodes.FORBIDDEN).json({ success: false, message: 'Forbidden' });
  if (ride.status !== 'completed')
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Rate only after completion' });

  const rating = await Rating.create({
    ride: ride._id,
    fromUser: req.user._id,
    toUser: ride.driver,
    stars,
    comment
  });

  res.json({ success: true, data: rating });
});

module.exports = {
  nearbyDrivers,
  requestRide,
  rideDetails,
  cancelRide,
  myRides,
  rateDriver
};
