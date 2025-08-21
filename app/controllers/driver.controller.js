const { StatusCodes } = require("http-status-codes");
const Ride = require("../models/Ride");
const asyncHandler = require("../utils/asyncHandler");
const { notifyUser } = require("../services/notification.service");
const { emitAll, emitToUser } = require("../config/socket");


const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body; // 'online' | 'offline'
  if (!['online', 'offline', 'busy'].includes(status))
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Invalid status' });

  if (req.user.role !== 'driver')
    return res.status(StatusCodes.FORBIDDEN).json({ success: false, message: 'Only driver' });

  req.user.driver.status = status;
  await req.user.save();
// emit to everyone (or to admin dashboards)
    emitAll('drivers:status', { driverId: req.user._id.toString(), status });
  res.json({ success: true, data: { status: req.user.driver.status } });
});

const updateLocation = asyncHandler(async (req, res) => {
  const { lat, lng } = req.body;
  if (req.user.role !== 'driver') return res.status(StatusCodes.FORBIDDEN).json({ success: false, message: 'Only driver' });
  if (typeof lat !== 'number' || typeof lng !== 'number')
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'lat/lng numbers required' });

  req.user.driver.location = { type: 'Point', coordinates: [lng, lat] };
  req.user.driver.locationUpdatedAt = new Date();
  await req.user.save();
 // broadcast live location to all listeners (map screens)
    emitAll('drivers:update', {
      driverId: req.user._id.toString(),
      lat, lng,
      updatedAt: req.user.driver.locationUpdatedAt
    });
  res.json({ success: true });
});

const myAssignedRides = asyncHandler(async (req, res) => {
  const rides = await Ride.find({ driver: req.user._id }).sort('-createdAt');
  res.json({ success: true, data: rides });
});

const acceptRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findById(req.params.id);
  if (!ride) return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Ride not found' });
  if (ride.driver?.toString() !== req.user._id.toString())
    return res.status(StatusCodes.FORBIDDEN).json({ success: false, message: 'Not your assignment' });
  if (!['assigned', 'requested'].includes(ride.status))
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Cannot accept' });

  ride.status = 'accepted';
  await ride.save();
  notifyUser(ride.passenger, { type: 'RIDE_ACCEPTED', rideId: ride._id.toString() });
emitToUser(ride.passenger.toString(), 'ride:update', { rideId: ride._id.toString(), status: 'accepted' });
  res.json({ success: true, data: ride });
});

const startRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findById(req.params.id);
  if (!ride) return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Ride not found' });
  if (ride.driver?.toString() !== req.user._id.toString())
    return res.status(StatusCodes.FORBIDDEN).json({ success: false, message: 'Forbidden' });

  ride.status = 'started';
  req.user.driver.status = 'busy';
  await Promise.all([ride.save(), req.user.save()]);
  notifyUser(ride.passenger, { type: 'RIDE_STARTED', rideId: ride._id.toString() });
emitToUser(ride.passenger.toString(), 'ride:update', { rideId: ride._id.toString(), status: 'started' });
  res.json({ success: true, data: ride });
});

const completeRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findById(req.params.id);
  if (!ride) return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Ride not found' });
  if (ride.driver?.toString() !== req.user._id.toString())
    return res.status(StatusCodes.FORBIDDEN).json({ success: false, message: 'Forbidden' });

  ride.status = 'completed';
  req.user.driver.status = 'online';
  await Promise.all([ride.save(), req.user.save()]);

  // (optional) create payment record if not exists
  await Payment.findOneAndUpdate(
    { ride: ride._id },
    {
      ride: ride._id,
      passenger: ride.passenger,
      driver: ride.driver,
      amount: ride.fare,
      status: 'paid',
      provider: ride.paymentMethod === 'cash' ? 'cash' : 'stripe'
    },
    { upsert: true, new: true }
  );

  notifyUser(ride.passenger, { type: 'RIDE_COMPLETED', rideId: ride._id.toString() });
  emitToUser(ride.passenger.toString(), 'ride:update', { rideId: ride._id.toString(), status: 'completed' });
  res.json({ success: true, data: ride });
});

module.exports = {
  updateStatus,
  updateLocation,
  myAssignedRides,
  acceptRide,
  startRide,
  completeRide
};
