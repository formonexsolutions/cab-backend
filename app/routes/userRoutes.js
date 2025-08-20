const express = require('express');
const router = express.Router();
const { getUsersByRole, updateUserLocation } = require('../controllers/userController');
const authMiddleware = require('../middleware/authmiddleware');

/**
 * @swagger
 * /api/users/role/{role}:
 *   get:
 *     summary: Get all users by role
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         schema:
 *           type: string
 *           enum: [passenger, driver, admin]
 *         required: true
 *         description: Role of the users to fetch
 *     responses:
 *       200:
 *         description: List of users for given role
 */
router.get('/role/:role', authMiddleware, getUsersByRole);

/**
 * @swagger
 * /api/users/update-location:
 *   put:
 *     summary: Update authenticated user's location
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *             properties:
 *               latitude:
 * 
 *                 type: number
 *                 example: 18.5204
 *               longitude:
 *                 type: number
 *                 example: 73.8567
 *     responses:
 *       200:
 *         description: Location updated successfully
 */
router.put('/update-location', authMiddleware, updateUserLocation);


module.exports = router;
