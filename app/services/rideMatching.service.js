const User = require('../models/User');

// find nearest online driver within `radiusMeters` (expand if none)
const findNearestDriver = async ({ lng, lat, radiusMeters = 100 }) => {
  let radius = radiusMeters;
  for (let i = 0; i < 5; i++) { // try up to 5 expansions
    const driver = await User.findOne({
      role: 'driver',
      'driver.status': 'online',
      'driver.verificationStatus': 'verified',
      'driver.location': {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radius
        }
      }
    }).select('_id name phone driver');
    if (driver) return driver;
    radius *= 2; // expand search
  }
  return null;
};

module.exports = {
  findNearestDriver
};
