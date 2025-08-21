

const User = require('../models/User');
const base64Response = require('../utils/base64Response');

// GET all users by role
exports.getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;

    // Validate role
    if (!['passenger', 'driver', 'admin'].includes(role)) {
      return res.status(400).send(base64Response({ message: 'Invalid role' }));
    }

    const users = await User.find({ role });

    res.status(200).send(
      base64Response({
        message: `Users with role ${role} fetched successfully`,
        count: users.length,
        users: users.map(user => ({
          id: user._id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
          documents: user.documents || {}
        }))
      })
    );
  } catch (error) {
    console.error(error);
    res.status(500).send(base64Response({ message: 'Server error' }));
  }
};

// Update Auth User Location
exports.updateUserLocation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).send(base64Response({ message: 'Latitude and Longitude are required' }));
    }

    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).send(base64Response({ message: 'User not found' }));
    }

    user.location = {
      type: "Point",
      coordinates: [longitude, latitude] // order: [lng, lat]
    };

    await user.save();

    res.status(200).send(
      base64Response({
        message: 'Location updated successfully',
        location: user.location
      })
    );
  } catch (error) {
    console.error(error);
    res.status(500).send(base64Response({ message: 'Server error' }));
  }
};

exports.getNearbyDrivers = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user || !user.location || !user.location.coordinates) {
      return res.status(400).send(base64Response({ message: 'User location not set' }));
    }

    const [lng, lat] = user.location.coordinates;

    const drivers = await User.find({
      role: 'driver',
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: 100 // distance in meters
        }
      }
    });

    res.status(200).send(
      base64Response({
        message: 'Nearby drivers fetched successfully',
        drivers
      })
    );
  } catch (error) {
    console.error(error);
    res.status(500).send(base64Response({ message: 'Server error' }));
  }
};


