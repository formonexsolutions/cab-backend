const express = require('express');
const authMiddleware = require('../middleware/authmiddleware');
const { createPaymentIntent } = require('../controllers/payment.controller');
const router = express.Router();

router.post('/intent', authMiddleware, createPaymentIntent);

module.exports = router;
