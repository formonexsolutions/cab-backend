const User = require('../models/User');
const Otp = require('../models/Otp');
const saveBase64File = require('../utils/saveBase64File');
const jwt = require('jsonwebtoken');
const base64Response = require('../utils/base64Response');

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
    console.log(`OTP for ${phone}: ${otp}`);

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
    console.log(`Login OTP for ${phone}: ${otp}`);

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


