const { listUsers, listDrivers, verifyDriver, overviewStats } = require("../controllers/admin.controller");
const authMiddleware = require("../middleware/authmiddleware");
const express = require('express');
const router = express.Router();

router.get('/users', authMiddleware, listUsers);
router.get('/drivers', authMiddleware, listDrivers);
router.post('/drivers/verify', authMiddleware, verifyDriver);
router.get('/stats', authMiddleware, overviewStats);

module.exports = router;
