const express = require('express');
const router = express.Router();
const { register, verifyOtp, login, getAuthUser, logout, updateAuthUser } = require('../controllers/authController');
const authMiddleware = require('../middleware/authmiddleware');


/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user (with OTP generation)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               phone:
 *                 type: string
 *                 example: "+919999999999"
 *               role:
 *                 type: string
 *                 enum: [passenger, driver, admin]
 *     responses:
 *       200:
 *         description: OTP sent successfully
 */

router.post('/register', register);


/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP and return JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - otp
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "9999999999"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 */

router.post('/verify-otp', verifyOtp);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login using phone number (OTP sent)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "9999999999"
 *     responses:
 *       200:
 *         description: OTP sent successfully
 */
router.post('/login', login);

/**
 * @swagger
 * /api/auth/auth-user:
 *   get:
 *     summary: Get authenticated user details
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authenticated user data
 */

router.get('/auth-user', authMiddleware, getAuthUser);

/**
 * @swagger
 * /api/auth/update:
 *   put:
 *     summary: Update authenticated user profile (with phone OTP flow if number changes)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Updated"
 *               phone:
 *                 type: string
 *                 example: "+919999999999"
 *                 description: If phone is changed, OTP will be sent for verification
 *               role:
 *                 type: string
 *                 enum: [passenger, driver, admin]
 *               license:
 *                 type: string
 *                 description: Base64 string for driver license
 *               policeVerification:
 *                 type: string
 *                 description: Base64 string for police verification doc
 *               carFront:
 *                 type: string
 *                 description: Base64 string for car front image
 *               carBack:
 *                 type: string
 *                 description: Base64 string for car back image
 *     responses:
 *       200:
 *         description: User updated successfully (or OTP sent if phone changed)
 */
router.put('/update', authMiddleware, updateAuthUser);



/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout the authenticated user (JWT Blacklist)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 *       401:
 *         description: Unauthorized - Invalid or missing token
 */
router.post('/logout', authMiddleware, logout);



module.exports = router;










