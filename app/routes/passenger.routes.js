const express = require('express');
const authMiddleware = require('../middleware/authmiddleware');
const {
  nearbyDrivers,
  requestRide,
  rideDetails,
  cancelRide,
  myRides,
  rateDriver
} = require('../controllers/passenger.controller');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Passenger
 *   description: Passenger related operations
 */

/**
 * @swagger
 * /api/passenger/nearby-drivers:
 *   get:
 *     summary: Find nearby online & verified drivers within a radius
 *     tags: [Passenger]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lat
 *         schema:
 *           type: number
 *         required: true
 *         description: Latitude of passenger
 *       - in: query
 *         name: lng
 *         schema:
 *           type: number
 *         required: true
 *         description: Longitude of passenger
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *         required: false
 *         description: Search radius in km (default 0.1 km = 100m)
 *     responses:
 *       200:
 *         description: List of nearby drivers
 */
router.get('/nearby-drivers', authMiddleware, nearbyDrivers);

/**
 * @swagger
 * /api/passenger/rides/request:
 *   post:
 *     summary: Request a new ride
 *     tags: [Passenger]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pickup, dropoff]
 *             properties:
 *               pickup:
 *                 type: object
 *                 example:
 *                   address: "MG Road, Pune"
 *                   location:
 *                     type: Point
 *                     coordinates: [73.8567, 18.5204]
 *               dropoff:
 *                 type: object
 *                 example:
 *                   address: "Shivaji Nagar, Pune"
 *                   location:
 *                     type: Point
 *                     coordinates: [73.8540, 18.5300]
 *               distanceKm:
 *                 type: number
 *                 example: 2.5
 *               durationMin:
 *                 type: number
 *                 example: 10
 *               surgeMultiplier:
 *                 type: number
 *                 example: 1
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, stripe]
 *                 example: cash
 *     responses:
 *       201:
 *         description: Ride created successfully
 */
router.post('/rides/request', authMiddleware, requestRide);

/**
 * @swagger
 * /api/passenger/rides/{id}:
 *   get:
 *     summary: Get ride details
 *     tags: [Passenger]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Ride ID
 *     responses:
 *       200:
 *         description: Ride details retrieved
 */
router.get('/rides/:id', authMiddleware, rideDetails);

/**
 * @swagger
 * /api/passenger/rides/{id}/cancel:
 *   post:
 *     summary: Cancel an ongoing/requested ride
 *     tags: [Passenger]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Ride ID
 *     responses:
 *       200:
 *         description: Ride cancelled successfully
 */
router.post('/rides/:id/cancel', authMiddleware, cancelRide);

/**
 * @swagger
 * /api/passenger/rides:
 *   get:
 *     summary: Get all rides of the authenticated passenger
 *     tags: [Passenger]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of passenger rides
 */
router.get('/rides', authMiddleware, myRides);

/**
 * @swagger
 * /api/passenger/rides/rate:
 *   post:
 *     summary: Rate your driver after ride completion
 *     tags: [Passenger]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rideId, stars]
 *             properties:
 *               rideId:
 *                 type: string
 *                 example: 64b7f3a4e3f92c001234abcd
 *               stars:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               comment:
 *                 type: string
 *                 example: "Great driver, safe ride!"
 *     responses:
 *       200:
 *         description: Rating submitted successfully
 */
router.post('/rides/rate', authMiddleware, rateDriver);

module.exports = router;
