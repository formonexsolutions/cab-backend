const express = require('express');
const authMiddleware = require('../middleware/authmiddleware');
const {
  updateStatus,
  updateLocation,
  myAssignedRides,
  acceptRide,
  startRide,
  completeRide
} = require('../controllers/driver.controller');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Driver
 *   description: Driver related operations
 */

/**
 * @swagger
 * /api/driver/status:
 *   put:
 *     summary: Update driver status (online, offline, busy)
 *     tags: [Driver]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [online, offline, busy]
 *                 example: online
 *     responses:
 *       200:
 *         description: Driver status updated
 */
router.put('/status', authMiddleware, updateStatus);

/**
 * @swagger
 * /api/driver/location:
 *   put:
 *     summary: Update driver current location
 *     tags: [Driver]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lat, lng]
 *             properties:
 *               lat:
 *                 type: number
 *                 example: 18.5204
 *               lng:
 *                 type: number
 *                 example: 73.8567
 *     responses:
 *       200:
 *         description: Location updated successfully
 */
router.put('/location', authMiddleware, updateLocation);

/**
 * @swagger
 * /api/driver/rides:
 *   get:
 *     summary: Get rides assigned to the authenticated driver
 *     tags: [Driver]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of rides assigned to the driver
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Ride'
 */
router.get('/rides', authMiddleware, myAssignedRides);

/**
 * @swagger
 * /api/driver/rides/{id}/accept:
 *   post:
 *     summary: Accept a ride assigned to the driver
 *     tags: [Driver]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Ride ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ride accepted successfully
 */
router.post('/rides/:id/accept', authMiddleware, acceptRide);

/**
 * @swagger
 * /api/driver/rides/{id}/start:
 *   post:
 *     summary: Start the ride
 *     tags: [Driver]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Ride ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ride started successfully
 */
router.post('/rides/:id/start', authMiddleware, startRide);

/**
 * @swagger
 * /api/driver/rides/{id}/complete:
 *   post:
 *     summary: Complete the ride
 *     tags: [Driver]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Ride ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ride completed successfully
 */
router.post('/rides/:id/complete', authMiddleware, completeRide);

module.exports = router;
