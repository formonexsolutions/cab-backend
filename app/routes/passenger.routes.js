const express = require('express');
const authMiddleware = require('../middleware/authmiddleware');
const {
  nearbyDrivers,
  requestRide,
  rideDetails,
  cancelRide,
  myRides,
  rateDriver,
  rideOptions,
  getDriverToPickupDistance
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
 *     summary: Request a new ride based on category (Economy, Premium, Carpool)
 *     tags: [Passenger]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pickup, dropoff, type]
 *             properties:
 *               pickup:
 *                 type: object
 *                 description: Pickup location details
 *                 example:
 *                   address: "MG Road, Pune"
 *                   location:
 *                     type: Point
 *                     coordinates: [73.8567, 18.5204]
 *               dropoff:
 *                 type: object
 *                 description: Dropoff location details
 *                 example:
 *                   address: "Shivaji Nagar, Pune"
 *                   location:
 *                     type: Point
 *                     coordinates: [73.8540, 18.5300]
 *               type:
 *                 type: string
 *                 enum: [Economy, Premium, Carpool]
 *                 description: Ride category
 *                 example: Premium
 *     responses:
 *       201:
 *         description: Ride created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Ride details
 */
router.post('/rides/request', authMiddleware, requestRide);

/**
 * @swagger
 * /api/passenger/rides/options:
 *   post:
 *     summary: Get available ride options (Economy, Premium, Carpool) based on nearby drivers
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
 *                 description: "Pickup location details"
 *                 example:
 *                   address: "MG Road, Pune"
 *                   location:
 *                     type: Point
 *                     coordinates: [73.8567, 18.5204]
 *               dropoff:
 *                 type: object
 *                 description: "Dropoff location details"
 *                 example:
 *                   address: "Shivaji Nagar, Pune"
 *                   location:
 *                     type: Point
 *                     coordinates: [73.8540, 18.5300]
 *               radius:
 *                 type: number
 *                 description: "Search radius in km. Default: 0.1 km (100 meters)"
 *                 example: 0.1
 *     responses:
 *       200:
 *         description: Available ride options with fare, ETA, and available drivers
 */

router.post('/rides/options', authMiddleware, rideOptions);

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

/**
 * @swagger
 * /api/passenger/driver-pickup-distance:
 *   get:
 *     summary: Get distance and estimated pickup time between driver and passenger
 *     description: Calculates the distance (in km) and estimated time (in minutes) from the assigned driver to the passenger's pickup location.
 *     tags: [Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: rideId
 *         required: true
 *         description: ID of the ride
 *         schema:
 *           type: string
 *           example: 64f1d4ab12d34c56a7c9ef01
 *     responses:
 *       200:
 *         description: Distance and ETA retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     rideId:
 *                       type: string
 *                       example: 64f1d4ab12d34c56a7c9ef01
 *                     distanceKm:
 *                       type: string
 *                       example: "2.35"
 *                     estimatedPickupTime:
 *                       type: string
 *                       example: "5 min"
 *       400:
 *         description: Missing rideId or invalid data
 *       404:
 *         description: Ride not found or driver not assigned
 */

router.get('/driver-pickup-distance', authMiddleware, getDriverToPickupDistance);

module.exports = router;
