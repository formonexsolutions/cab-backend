const express = require('express');
const authMiddleware = require('../middleware/authmiddleware');
const { updateStatus, updateLocation, myAssignedRides, acceptRide, startRide, completeRide } = require('../controllers/driver.controller');
const router = express.Router();

router.put('/status', authMiddleware, updateStatus);
router.put('/location', authMiddleware, updateLocation);
router.get('/rides', authMiddleware, myAssignedRides);
router.post('/rides/:id/accept', authMiddleware, acceptRide);
router.post('/rides/:id/start', authMiddleware, startRide);
router.post('/rides/:id/complete', authMiddleware, completeRide);

module.exports = router;
