
const { StatusCodes } = require('http-status-codes');
const Ride = require('../models/Ride.js');
const User =require('../models/User.js');
const asyncHandler = require('../utils/asyncHandler.js');

const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-passwordHash');
  res.json({ success: true, data: users });
});

const listDrivers = asyncHandler(async (req, res) => {
  const drivers = await User.find({ role: 'driver' }).select('-passwordHash');
  res.json({ success: true, data: drivers });
});

const verifyDriver = asyncHandler(async (req, res) => {
  const { driverId, status } = req.body; // 'verified' | 'rejected' | 'pending'
  const driver = await User.findById(driverId);
  if (!driver || driver.role !== 'driver') return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Driver not found' });
  driver.driver.verificationStatus = status;
  await driver.save();
  res.json({ success: true, data: driver });
});

const overviewStats = asyncHandler(async (req, res) => {
  const [users, drivers, rides] = await Promise.all([
    User.countDocuments({ role: 'passenger' }),
    User.countDocuments({ role: 'driver' }),
    Ride.countDocuments()
  ]);
  res.json({ success: true, data: { users, drivers, rides } });
});

module.exports = {
  listUsers,
  listDrivers,
  verifyDriver,
  overviewStats
};
