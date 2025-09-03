const { StatusCodes } = require("http-status-codes");
const Ride = require("../models/Ride");
const asyncHandler = require("../utils/asyncHandler");
const { notifyUser } = require("../services/notification.service");
const { emitAll, emitToUser } = require("../config/socket");
const Payment = require("../models/Payment");
const crypto = require('crypto');

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

// const acceptRide = asyncHandler(async (req, res) => {
//   const ride = await Ride.findById(req.params.id);
//   if (!ride) return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Ride not found' });
//   if (ride.driver?.toString() !== req.user._id.toString())
//     return res.status(StatusCodes.FORBIDDEN).json({ success: false, message: 'Not your assignment' });
//   if (!['assigned', 'requested'].includes(ride.status))
//     return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Cannot accept' });

//   ride.status = 'accepted';
//   await ride.save();
//   notifyUser(ride.passenger, { type: 'RIDE_ACCEPTED', rideId: ride._id.toString() });
// emitToUser(ride.passenger.toString(), 'ride:update', { rideId: ride._id.toString(), status: 'accepted' });
//   res.json({ success: true, data: ride });
// });

// Race-condition safe version using atomic update
const acceptRide = asyncHandler(async (req, res) => {
  const otp = crypto.randomInt(1000, 9999).toString(); // 4-digit OTP
  console.log(req.params.id,"req.params.id");
  console.log(req.user._id,"req.user._id");
  
  // Use atomic update to prevent race conditions and track driver response
  const ride = await Ride.findOneAndUpdate(
    { 
      _id: req.params.id, 
      status: 'requested', // Only accept if still in requested state
      $or: [
        { driver: { $exists: false } },
        { driver: null }
      ]
    },
    { 
      driver: req.user._id,
      status: 'accepted',
      startOtp: otp,
      otpExpiry: new Date(Date.now() + 10 * 60 * 1000), // 10 min expiry
      
      // Update the nearbyDrivers array to mark this driver as responded
      $set: {
        'nearbyDrivers.$[elem].responded': true,
        'nearbyDrivers.$[elem].responseAt': new Date(),
        'nearbyDrivers.$[elem].responseType': 'accepted'
      }
    },
    { 
      new: true,
      arrayFilters: [{ 'elem.driver': req.user._id }] // Only update the current driver's record
    }
  ).populate('passenger', 'name phone');
console.log(ride);

  if (!ride) {
    return res.status(StatusCodes.CONFLICT).json({ 
      success: false, 
      message: 'Ride no longer available or already assigned to another driver' 
    });
  }

  // Update other drivers in nearbyDrivers as "missed opportunity" (optional)
  await Ride.updateOne(
    { _id: req.params.id },
    {
      $set: {
        'nearbyDrivers.$[elem].responded': true,
        'nearbyDrivers.$[elem].responseAt': new Date(),
        'nearbyDrivers.$[elem].responseType': 'timeout'
      }
    },
    {
      arrayFilters: [
        { 
          'elem.driver': { $ne: req.user._id }, // Not the accepting driver
          'elem.responded': false // Haven't responded yet
        }
      ]
    }
  );

  // Notify passenger with driver details
  notifyUser(ride.passenger._id, { 
    type: 'RIDE_ACCEPTED', 
    otp, 
    rideId: ride._id.toString(),
    driver: {
      id: req.user._id,
      name: req.user.name,
      phone: req.user.phone,
      vehicle: req.user.driver.vehicle,
      location: req.user.driver.location
    }
  });

  emitToUser(ride.passenger._id.toString(), 'ride:update', { 
    rideId: ride._id.toString(), 
    status: 'accepted', 
    otp,
    driver: {
      id: req.user._id,
      name: req.user.name,
      phone: req.user.phone,
      vehicle: req.user.driver.vehicle,
      location: req.user.driver.location
    }
  });

  // Notify other drivers that this ride is no longer available
  const otherDriverIds = ride.nearbyDrivers
    .filter(nd => nd.driver.toString() !== req.user._id.toString())
    .map(nd => nd.driver.toString());
  
  otherDriverIds.forEach(driverId => {
    emitToUser(driverId, 'ride:taken', { rideId: ride._id.toString() });
  });

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

const verifyOtpAndStartRide = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  const ride = await Ride.findById(req.params.id);
  if (!ride) return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Ride not found' });
  if (ride.driver?.toString() !== req.user._id.toString())
    return res.status(StatusCodes.FORBIDDEN).json({ success: false, message: 'Forbidden' });

  if (ride.startOtp !== otp)
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Invalid OTP' });
  if (Date.now() > ride.otpExpiry)
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'OTP expired' });

  ride.status = 'started';
  ride.startOtp = undefined;
  ride.otpExpiry = undefined;
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
  verifyOtpAndStartRide,
  completeRide
};
