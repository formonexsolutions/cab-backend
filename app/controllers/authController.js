const Otp = require('../models/Otp');
const saveBase64File = require('../utils/saveBase64File');
const jwt = require('jsonwebtoken');
const TokenBlacklist = require('../models/TokenBlacklist');
const base64Response = require('../utils/base64Response');
const twilio = require('twilio');
const User = require('../models/User');
const { getIO } = require('../config/socket');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

exports.register = async (req, res) => {
  try {
    const { name, phone, email, role, license, policeVerification, carFront, carBack, vehicle } = req.body;

    if (!name || !phone || !role || !email) {
      return res.status(400).json({ message: 'Name, phone, role, and email are required' });
    }
    if (!['passenger', 'driver', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    let user = await User.findOne({ phone });
    if (!user) {
      user = new User({ name, phone, role, email });
    }

    if (role === 'driver') {
      // Prepare driver object
      user.driver = user.driver || {};
      user.driver.status = 'offline';
      user.driver.verificationStatus = 'pending';

      // Save documents & vehicle if provided
      user.driver.documents = {
        license: license ? saveBase64File(license, 'drivers', 'license') : null,
        policeVerification: policeVerification ? saveBase64File(policeVerification, 'drivers', 'policeVerification') : null,
        carFront: carFront ? saveBase64File(carFront, 'drivers', 'carFront') : null,
        carBack: carBack ? saveBase64File(carBack, 'drivers', 'carBack') : null
      };
      user.driver.vehicle = vehicle || {};

      // Determine KYC status
      const docs = user.driver.documents;
      user.driver.kycStatus = !!(
        docs.license &&
        docs.policeVerification &&
        docs.carFront &&
        docs.carBack &&
        user.driver.vehicle.brand &&
        user.driver.vehicle.model &&
        user.driver.vehicle.plate
      );
    }

    await user.save();

    // Send OTP flow (same as before)
    const otp = generateOTP();
    const otpExpiry = Date.now() + 5 * 60 * 1000;
    await Otp.deleteMany({ phone });
    await Otp.create({ phone, otp, otpExpiry });

    await client.messages.create({
      body: `Your verification OTP is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });

    res.status(200).send(base64Response({ message: 'OTP sent successfully', phone }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};



exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone and OTP are required' });
    }

    const otpRecord = await Otp.findOne({ phone, otp });
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (Date.now() > otpRecord.otpExpiry) {
      return res.status(400).json({ message: 'OTP expired' });
    }

    // Mark user as verified
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isVerified = true;
    await user.save();

    // Delete OTP after verification
    await Otp.deleteMany({ phone });

    // Generate JWT token
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '365d' });
 // Emit socket authentication event (real-time login)
    try {
      const io = getIO(); // get initialized Socket.IO instance
      io.to(`user:${user._id}`).emit('auth', { userId: user._id.toString() });
      console.log('Socket emit successful');

    } catch (err) {
      console.log('Socket emit failed (user may not be connected yet):', err.message);
    }
    const responseData = {
      message: 'OTP verified successfully',
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role
      },
      token
    };
    res.status(200).send(base64Response(responseData));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).send(base64Response({ message: 'Phone is required' }));
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).send(base64Response({ message: 'User not found' }));
    }

    // Generate OTP for login
    const otp = generateOTP();
    const otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Remove old OTPs for this phone
    await Otp.deleteMany({ phone });

    // Save new OTP
    await Otp.create({ phone, otp, otpExpiry });

    // TODO: Send OTP via Twilio
     // Send OTP via Twilio
    await client.messages.create({
      body: `Your login OTP is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to:phone,
    });

    res.status(200).send(base64Response({ message: 'OTP sent successfully', phone }));
  } catch (error) {
    console.error(error);
    res.status(500).send(base64Response({ message: 'Server error' }));
  }
};





exports.getAuthUser = async (req, res) => {
  try {
    const userId = req.user._id; 
    const token = req.headers.authorization?.split(' ')[1]; // Extract JWT from header

    const user = await User.findById(userId).lean(); // <-- use .lean() to get plain object
    if (!user) {
      return res.status(404).send(base64Response({ message: 'User not found' }));
    }

    let tokenExpired = false;
    if (token) {
      try {
        jwt.verify(token, process.env.JWT_SECRET);
        tokenExpired = false;
      } catch (err) {
        if (err.name === 'TokenExpiredError') {
          tokenExpired = true;
        } else {
          console.warn('JWT verify failed:', err.message);
        }
      }
    }

    // Add tokenExpire field to the user object
    const responseUser = {
      ...user,
      tokenExpire: tokenExpired
    };

    res.status(200).send(base64Response(responseUser));
  } catch (error) {
    console.error(error);
    res.status(500).send(base64Response({ message: 'Server error' }));
  }
};



exports.updateAuthUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, role, phone, email, license, policeVerification, carFront, carBack, vehicle } = req.body;

    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).send(base64Response({ message: 'User not found' }));
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (role && ['passenger', 'driver', 'admin'].includes(role)) {
      user.role = role;
    }

    let message = "User updated successfully";

    // Phone update logic (same as before)
    if (phone && phone !== user.phone) {
      const otp = generateOTP();
      const otpExpiry = Date.now() + 5 * 60 * 1000;

      await Otp.deleteMany({ phone });
      await Otp.create({ phone, otp, otpExpiry });

      await client.messages.create({
        body: `Your OTP to update phone is: ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });

      user.phone = phone;
      user.isVerified = false;
      message = "Phone number updated, please verify OTP sent to new number";
    }

    // Driver-specific updates
    if (user.role === 'driver') {
      user.driver.documents = {
        ...user.driver.documents,
        license: license ? saveBase64File(license, 'drivers', 'license') : user.driver.documents?.license,
        policeVerification: policeVerification ? saveBase64File(policeVerification, 'drivers', 'policeVerification') : user.driver.documents?.policeVerification,
        carFront: carFront ? saveBase64File(carFront, 'drivers', 'carFront') : user.driver.documents?.carFront,
        carBack: carBack ? saveBase64File(carBack, 'drivers', 'carBack') : user.driver.documents?.carBack
      };

      if (vehicle) {
        user.driver.vehicle = {
          ...user.driver.vehicle,
          ...vehicle
        };
      }

      // Recalculate KYC status
      const docs = user.driver.documents;
      user.driver.kycStatus = !!(
        docs.license &&
        docs.policeVerification &&
        docs.carFront &&
        docs.carBack &&
        user.driver.vehicle.brand &&
        user.driver.vehicle.model &&
        user.driver.vehicle.plate
      );
    }

    await user.save();

    res.status(200).send(
      base64Response({
        message,
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
          kycStatus: user.driver?.kycStatus || false
        }
      })
    );
  } catch (error) {
    console.error(error);
    res.status(500).send(base64Response({ message: 'Server error' }));
  }
};



exports.logout = async (req, res) => {
  try {
    const token = req.token; 
    const decoded = jwt.decode(token);

    if (decoded && decoded.exp) {
      const expiryDate = new Date(decoded.exp * 1000);
      await TokenBlacklist.create({ token, expiry: expiryDate });
    }

    res.status(200).send(base64Response({ message: 'Logged out successfully' }));
  } catch (error) {
    console.error(error);
    res.status(500).send(base64Response({ message: 'Server error' }));
  }
};


