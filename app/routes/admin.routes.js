const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authmiddleware');
const {
    listUsers,
    listDrivers,
    verifyDriver,
    overviewStats
} = require('../controllers/admin.controller');

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin management APIs
 */

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all registered users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
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
 *                     $ref: '#/components/schemas/User'
 */
router.get('/users', authMiddleware, listUsers);

/**
 * @swagger
 * /api/admin/drivers:
 *   get:
 *     summary: Get all drivers
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of drivers
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
 *                     $ref: '#/components/schemas/User'
 */
router.get('/drivers', authMiddleware, listDrivers);

/**
 * @swagger
 * /api/admin/drivers/verify:
 *   post:
 *     summary: Verify or reject a driver
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [driverId, status]
 *             properties:
 *               driverId:
 *                 type: string
 *                 example: "64a8c37f23d9b2f0a7a6b1c1"
 *               status:
 *                 type: string
 *                 enum: [verified, rejected, pending]
 *                 example: verified
 *     responses:
 *       200:
 *         description: Driver verification updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 */
router.post('/drivers/verify', authMiddleware, verifyDriver);

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get system overview stats
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overview statistics of users, drivers, and rides
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
 *                     users:
 *                       type: integer
 *                       example: 120
 *                     drivers:
 *                       type: integer
 *                       example: 30
 *                     rides:
 *                       type: integer
 *                       example: 450
 */
router.get('/stats', authMiddleware, overviewStats);

module.exports = router;
