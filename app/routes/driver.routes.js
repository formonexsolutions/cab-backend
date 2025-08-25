const express = require('express');
const authMiddleware = require('../middleware/authmiddleware');
const {
  updateStatus,
  updateLocation,
  myAssignedRides,
  acceptRide,
  startRide,
  completeRide,
  verifyOtpAndStartRide
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
 */
router.get('/rides', authMiddleware, myAssignedRides);

/**
 * @swagger
 * /api/driver/rides/{id}/accept:
 *   post:
 *     summary: Accept a ride and generate a start OTP
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
 *         description: Ride accepted successfully with OTP
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
 *                     _id:
 *                       type: string
 *                       example: "64f9a56d89cdef1234567890"
 *                     status:
 *                       type: string
 *                       example: "accepted"
 *                     startOtp:
 *                       type: string
 *                       description: "4-digit OTP for ride start verification"
 *                       example: "4821"
 *                     otpExpiry:
 *                       type: string
 *                       format: date-time
 *                       description: "OTP expiry time (10 minutes from generation)"
 */

router.post('/rides/:id/accept', authMiddleware, acceptRide);

// /**
//  * @swagger
//  * /api/driver/rides/{id}/start:
//  *   post:
//  *     summary: Start the ride
//  *     tags: [Driver]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - name: id
//  *         in: path
//  *         required: true
//  *         description: Ride ID
//  *         schema:
//  *           type: string
//  *     responses:
//  *       200:
//  *         description: Ride started successfully
//  */
// router.post('/rides/:id/start', authMiddleware, startRide);

/**
 * @swagger
 * /api/driver/rides/{id}/verify-otp-start:
 *   post:
 *     summary: Verify OTP and start the ride
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [otp]
 *             properties:
 *               otp:
 *                 type: string
 *                 description: 4-digit OTP received by passenger
 *                 example: "4821"
 *     responses:
 *       200:
 *         description: Ride started successfully after OTP verification
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
 *                     _id:
 *                       type: string
 *                       example: "64f9a56d89cdef1234567890"
 *                     status:
 *                       type: string
 *                       example: "started"
 *       400:
 *         description: Invalid or expired OTP
 *       403:
 *         description: Forbidden - Only assigned driver can start ride
 *       404:
 *         description: Ride not found
 */

router.post('/rides/:id/verify-otp-start', authMiddleware, verifyOtpAndStartRide);
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
