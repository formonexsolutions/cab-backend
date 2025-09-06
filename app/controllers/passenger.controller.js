const  StatusCodes= require('http-status-codes');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { calculateFare } = require('../services/fare.service');
const Ride = require('../models/Ride');
const Rating = require('../models/Rating');
const { findNearestDriver } = require('../services/rideMatching.service');
const { notifyUser } = require('../services/notification.service');
const { emitToUser } = require('../config/socket');
const { getDistance } = require('geolib');
// Example mapping: You can make this dynamic (DB or config file)
const vehicleCategories = {
  Economy: (process.env.VEHICLE_ECONOMY || '').split(','),
  Premium: (process.env.VEHICLE_PREMIUM || '').split(','),
  Carpool: (process.env.VEHICLE_CARPOOL || '').split(',')
};


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

// const requestRide = asyncHandler(async (req, res) => {
//   const { pickup, dropoff,surgeMultiplier = 1, paymentMethod = 'cash' } = req.body;

//   if (!pickup?.location?.coordinates || !dropoff?.location?.coordinates)
//     return res.status(400).json({ success: false, message: 'pickup/dropoff required' });

//   // Extract coordinates
//   const [pickupLng, pickupLat] = pickup.location.coordinates;
//   const [dropoffLng, dropoffLat] = dropoff.location.coordinates;

//   // Calculate distance using geolib (in meters)
//   const distanceMeters = getDistance(
//     { latitude: pickupLat, longitude: pickupLng },
//     { latitude: dropoffLat, longitude: dropoffLng }
//   );
//   const distanceKm = distanceMeters / 1000;
//   // Estimate duration (you can refine with real traffic APIs)
//   const durationMin = Math.max(10, Math.round(distanceKm * 2)); // example: 2 min/km, min 10 min
//   const fare = calculateFare({ distanceKm, durationMin, surgeMultiplier });

//   const ride = await Ride.create({
//     passenger: req.user._id,
//     pickup,
//     dropoff,
//     distanceKm,
//     durationMin,
//     surgeMultiplier,
//     fare,
//     paymentMethod,
//     status: 'requested'
//   });

//   // assign nearest driver
//   const [lng, lat] = pickup.location.coordinates;

//   const driver = await findNearestDriver({ lng, lat, radiusMeters: 200 }); // start with 200m

//   if (driver) {
//     ride.driver = driver._id;
//     ride.status = 'assigned';
//     await ride.save();
//     notifyUser(driver._id, { type: 'NEW_RIDE', rideId: ride._id.toString() });
//   }
// // notify the driver & passenger
//       emitToUser(driver._id.toString(), 'ride:new', { rideId: ride._id.toString() });
//       emitToUser(req.user._id.toString(), 'ride:update', { rideId: ride._id.toString(), status: 'assigned', driver });
//   res.status(201).json({ success: true, data: ride });
// });


const requestRide = asyncHandler(async (req, res) => {
  const { pickup, dropoff, type, surgeMultiplier = 1, paymentMethod = 'cash' } = req.body;

  if (!pickup?.location?.coordinates || !dropoff?.location?.coordinates) {
    return res.status(400).json({ success: false, message: 'pickup/dropoff required' });
  }

  if (!type) {
    return res.status(400).json({ success: false, message: 'Ride type is required (Economy, Premium, Carpool)' });
  }

  // Extract coordinates
  const [pickupLng, pickupLat] = pickup.location.coordinates;
  const [dropoffLng, dropoffLat] = dropoff.location.coordinates;

  // Calculate distance & estimated fare
  const distanceMeters = getDistance(
    { latitude: pickupLat, longitude: pickupLng },
    { latitude: dropoffLat, longitude: dropoffLng }
  );
  const distanceKm = distanceMeters / 1000;
  const durationMin = Math.max(10, Math.round(distanceKm * 2));
  const fare = calculateFare({ distanceKm, durationMin, surgeMultiplier });

 

  const nearbyDrivers = await User.find({
    role: 'driver',
    'driver.status': 'online',
    'driver.verificationStatus': 'verified',
    'driver.vehicle.brand': { $in: vehicleCategories[type] || [] },
    'driver.location': {
      $near: {
        $geometry: { type: 'Point', coordinates: [pickupLng, pickupLat] },
        $maxDistance: 200 // 200 meters default
      }
    }
  }).select('_id name phone driver.vehicle');

  if (!nearbyDrivers.length) {
    return res.status(404).json({ success: false, message: 'No drivers available for this category nearby' });
  }

  const nearbyDriversData = nearbyDrivers.map(driver => ({
    driver: driver._id,
    distance: distanceKm, // distance in meters
    notifiedAt: new Date(),
    responded: false
  }));
 

  // Create ride in requested status (not yet assigned)
  const ride = await Ride.create({
    passenger: req.user._id,
    pickup,
    dropoff,
    distanceKm,
    durationMin,
    surgeMultiplier,
    fare,
    type,
    paymentMethod,
    nearbyDrivers: nearbyDriversData,
    status: 'requested'
  });

  // Notify all available drivers of this category
  nearbyDrivers.forEach(driver => {
    notifyUser(driver._id, { type: 'NEW_RIDE', rideId: ride._id.toString() });
    emitToUser(driver._id.toString(), 'ride:new', {
      rideId: ride._id.toString(),
      pickup,
      dropoff,
      type,
      fare,
      passenger: {
        id: req.user._id,
        name: req.user.name,
        phone: req.user.phone
      }
    });
  });

  // Notify passenger that request is sent
  emitToUser(req.user._id.toString(), 'ride:update', {
    rideId: ride._id.toString(),
    status: 'searching',
    type
  });

  res.status(201).json({ success: true, data: ride });
});

const rideDetails = asyncHandler(async (req, res) => {
  const ride = await Ride.findById(req.params.id).select('-nearbyDrivers')
    .populate('passenger', 'name phone')
    .populate('driver', 'name phone driver.vehicle driver.location');

  if (!ride) {
    return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Ride not found' });
  }

  if (
    ride.passenger.toString?.() !== req.user._id.toString() &&
    ride.passenger._id?.toString() !== req.user._id.toString()
  ) {
    return res.status(StatusCodes.FORBIDDEN).json({ success: false, message: 'Forbidden' });
  }

  let pickupDistanceKm = null;
  let estimatedPickupTime = null;

  if (ride.driver?.driver?.location?.coordinates) {
    const [pickupLng, pickupLat] = ride.pickup.location.coordinates;
    const [driverLng, driverLat] = ride.driver.driver.location.coordinates;

    const distanceMeters = getDistance(
      { latitude: driverLat, longitude: driverLng },
      { latitude: pickupLat, longitude: pickupLng }
    );
    pickupDistanceKm = (distanceMeters / 1000).toFixed(2);

    // Assuming ~30 km/h (≈ 2 min/km)
    estimatedPickupTime = `${Math.max(3, Math.round((distanceMeters / 1000) * 2))} min`;
  }

  res.json({
    success: true,
    data: {
      ...ride.toObject(),
      pickupDistanceKm,
      estimatedPickupTime
    }
  });
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

   if (ride.driver) {
      emitToUser(ride.driver.toString(), 'ride:cancelled', { rideId: ride._id.toString() });
    }
    emitToUser(ride.passenger.toString(), 'ride:update', { rideId: ride._id.toString(), status: 'cancelled' });
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

const rideOptions = asyncHandler(async (req, res) => {
  const { pickup, dropoff, radius = 0.1 } = req.body; // radius = 100m default

  if (!pickup?.location?.coordinates || !dropoff?.location?.coordinates) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'pickup and dropoff are required'
    });
  }

  const [pickupLng, pickupLat] = pickup.location.coordinates;
  const [dropoffLng, dropoffLat] = dropoff.location.coordinates;

  // Calculate trip distance
  const distanceMeters = getDistance(
    { latitude: pickupLat, longitude: pickupLng },
    { latitude: dropoffLat, longitude: dropoffLng }
  );
  const distanceKm = distanceMeters / 1000;
  const durationMin = Math.max(10, Math.round(distanceKm * 2)); // Estimate

  // Find nearby verified drivers
  const nearbyDrivers = await User.find({
    role: 'driver',
    'driver.status': 'online',
    'driver.verificationStatus': 'verified',
    'driver.location': {
      $near: {
        $geometry: { type: 'Point', coordinates: [pickupLng, pickupLat] },
        $maxDistance: Number(radius) * 1000
      }
    }
  }).select('driver.vehicle.brand driver.vehicle.model driver.vehicle.seats');

  // Categorize based on brand
  const categories = {
    Economy: [],
    Premium: [],
    Carpool: []
  };

  nearbyDrivers.forEach(driver => {
    const brand = driver.driver?.vehicle?.brand || '';
    let matchedCategory = 'Economy'; 

    if (vehicleCategories.Premium.includes(brand)) matchedCategory = 'Premium';
    else if (vehicleCategories.Carpool.includes(brand)) matchedCategory = 'Carpool';

    categories[matchedCategory].push(driver);
  });

  // Generate response
  const rideOptions = Object.entries(categories).map(([type, drivers]) => {
    const fare = calculateFare({ distanceKm, durationMin, surgeMultiplier: 1 });
    return {
      type,
      price: `${fare.toFixed(2)}`,
      eta: `${durationMin} min`,
      seats: drivers[0]?.driver?.vehicle?.seats || (type === 'Premium' ? 4 : 6),
      availableDrivers: drivers.length,
      isPopular: type === 'Premium'
    };
  });

  res.status(200).json({
    success: true,
    data: rideOptions
  });
});

const getDriverToPickupDistance = asyncHandler(async (req, res) => {
  const { rideId } = req.query; // or req.body if you prefer POST

  if (!rideId) {
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'rideId is required' });
  }

  // Find ride
  const ride = await Ride.findById(rideId).populate('driver', 'driver.location');
  if (!ride) {
    return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Ride not found' });
  }

  if (!ride.driver) {
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Driver not assigned to this ride yet' });
  }

  // Get pickup coordinates
  const [pickupLng, pickupLat] = ride.pickup.location.coordinates;

  // Get driver location
  const driverLocation = ride.driver?.driver?.location?.coordinates;
  if (!driverLocation) {
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Driver location not available' });
  }

  const [driverLng, driverLat] = driverLocation;

  // Calculate distance (driver → passenger pickup)
  const distanceMeters = getDistance(
    { latitude: driverLat, longitude: driverLng },
    { latitude: pickupLat, longitude: pickupLng }
  );
  const distanceKm = distanceMeters / 1000;

  // Estimate pickup time (assume ~30 km/h => 2 min/km)
  const estimatedPickupTime = Math.max(3, Math.round(distanceKm * 2)); // Minimum 3 min

  res.status(StatusCodes.OK).json({
      rideId,
      distanceKm: distanceKm.toFixed(2),
      estimatedPickupTime: `${estimatedPickupTime} min`
    }
  );
});

module.exports = {
  nearbyDrivers,
  requestRide,
  rideDetails,
  cancelRide,
  myRides,
  rateDriver,
  rideOptions,
  getDriverToPickupDistance
};
