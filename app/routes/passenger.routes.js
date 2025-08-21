const express = require('express');
const authMiddleware = require('../middleware/authmiddleware');
const { nearbyDrivers, requestRide, rideDetails, cancelRide, myRides, rateDriver } = require('../controllers/passenger.controller');
const router = express.Router();

router.get('/nearby-drivers', authMiddleware, nearbyDrivers);
router.post('/rides/request', authMiddleware, requestRide);
router.get('/rides/:id', authMiddleware, rideDetails);
router.post('/rides/:id/cancel', authMiddleware, cancelRide);
router.get('/rides', authMiddleware, myRides);
router.post('/rides/rate', authMiddleware, rateDriver);

module.exports = router;
