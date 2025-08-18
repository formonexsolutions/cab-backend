const User = require('../models/User');
const Otp = require('../models/Otp');
const saveBase64File = require('../utils/saveBase64File');
const jwt = require('jsonwebtoken');
const TokenBlacklist = require('../models/TokenBlacklist');
const base64Response = require('../utils/base64Response');
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

exports.register = async (req, res) => {
  try {
    const { name, phone, role, license, policeVerification, carFront, carBack } = req.body;

    if (!name || !phone || !role) {
      return res.status(400).json({ message: 'Name, phone, and role are required' });
    }
    if (!['passenger', 'driver', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    let user = await User.findOne({ phone });
    if (!user) {
      user = new User({ name, phone, role });
    }

    if (role === 'driver') {
      const licensePath = saveBase64File(license, 'drivers', 'license');
      const policeVerificationPath = saveBase64File(policeVerification, 'drivers', 'policeVerification');
      const carFrontPath = saveBase64File(carFront, 'drivers', 'carFront');
      const carBackPath = saveBase64File(carBack, 'drivers', 'carBack');

      if (!licensePath || !policeVerificationPath || !carFrontPath || !carBackPath) {
        return res.status(400).json({ message: 'Driver documents are required and must be valid base64' });
      }

      user.documents = {
        license: licensePath,
        policeVerification: policeVerificationPath,
        carFront: carFrontPath,
        carBack: carBackPath
      };
    }

    await user.save();

    // Generate OTP & save to OTP collection
    const otp = generateOTP();
    const otpExpiry = Date.now() + 5 * 60 * 1000; 

    // Remove any existing OTP for this phone
    await Otp.deleteMany({ phone });

    await Otp.create({ phone, otp, otpExpiry });

    // TODO: send OTP using Twilio here
    // Send OTP via Twilio
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
    const user = req.user; // set by authMiddleware
    res.status(200).send(
      base64Response({
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified
      })
    );
  } catch (error) {
    console.error(error);
    res.status(500).send(base64Response({ message: 'Server error' }));
  }
};

exports.updateAuthUser = async (req, res) => {
  try {
    const userId = req.user._id; // comes from authMiddleware
    const { name, role, phone, license, policeVerification, carFront, carBack } = req.body;

    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).send(base64Response({ message: 'User not found' }));
    }

    // Update normal fields
    if (name) user.name = name;
    if (role && ['passenger', 'driver', 'admin'].includes(role)) {
      user.role = role;
    }

    let message = "User updated successfully";

    // ✅ If phone is changed, trigger OTP verification
    if (phone && phone !== user.phone) {
      const otp = generateOTP();
      const otpExpiry = Date.now() + 5 * 60 * 1000;

      // Remove old OTPs for that new phone
      await Otp.deleteMany({ phone });

      // Save new OTP
      await Otp.create({ phone, otp, otpExpiry });

      // Send OTP via Twilio
      await client.messages.create({
        body: `Your OTP to update phone is: ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });

      // Save new phone temporarily
      user.phone = phone;
      user.isVerified = false; // force re-verification
      message = "Phone number updated, please verify OTP sent to new number";
    }

    // Update driver documents if applicable
    if (user.role === 'driver') {
      if (license) user.documents.license = saveBase64File(license, 'drivers', 'license');
      if (policeVerification) user.documents.policeVerification = saveBase64File(policeVerification, 'drivers', 'policeVerification');
      if (carFront) user.documents.carFront = saveBase64File(carFront, 'drivers', 'carFront');
      if (carBack) user.documents.carBack = saveBase64File(carBack, 'drivers', 'carBack');
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
          pendingPhone: user.pendingPhone || null
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


