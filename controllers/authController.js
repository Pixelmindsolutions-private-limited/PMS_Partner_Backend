import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const generateOtp = 1234;

export const sendOtp = async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile)
      return res.status(400).json({ success: false, message: 'Mobile required' });

    let user = await User.findOne({ mobile });

    if (!user) {
      user = await User.create({
        mobile,
        otp: generateOtp,
        isRegistered: false,
        isApproved: false,
      });
    } else {
      user.otp = generateOtp;
      await user.save();
    }

    // TODO: send SMS (MSG91 / Twilio / Fast2SMS)
    console.log(`📱 OTP for ${mobile}: ${generateOtp}`);

    return res.json({
      success: true,
      message: 'OTP sent successfully',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp)
      return res.status(400).json({ success: false, message: 'Mobile & OTP required' });

    const user = await User.findOne({ mobile });
    if (!user || user.otp == null)
      return res.status(400).json({ success: false, message: 'OTP not requested' });

    if (user.otp !== Number(otp)) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    user.otp = null;
    await user.save();

    if (!user.isRegistered) {
      const tempToken = jwt.sign(
        { mobile, purpose: 'registration' },
        process.env.TEMP_JWT_SECRET,
        { expiresIn: '1m' }
      );

      return res.json({
        success: true,
        isRegistered: false,
        message: 'Please complete registration',
        tempToken,
      });
    }

    // ---------- REGISTERED, NOT APPROVED ----------
    if (!user.isApproved) {
      return res.status(403).json({
        success: false,
        isRegistered: true,
        isApproved: false,
        message: 'Your account is pending admin approval',
      });
    }

    // ---------- BLOCKED ----------
    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: 'Account blocked' });
    }

    const token = jwt.sign(
      { id: user._id, mobile: user.mobile },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      isRegistered: true,
      isApproved: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        aadharImage: user.aadharImage,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================
// COMPLETE REGISTRATION
// ======================================================
export const completeRegistration = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const tempToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!tempToken)
      return res.status(401).json({ success: false, message: 'Temp token missing' });

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.TEMP_JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Temp token expired or invalid' });
    }

    const { name, email } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name required' });
    if (!req.file)
      return res.status(400).json({ success: false, message: 'Aadhar image required' });

    const aadharUrl = `${req.protocol}://${req.get('host')}/uploads/aadhar/${req.file.filename}`;

    const user = await User.findOne({ mobile: decoded.mobile });
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });
    if (user.isRegistered)
      return res.status(400).json({ success: false, message: 'User already registered' });

    user.name = name;
    user.email = email;
    user.aadharImage = aadharUrl;
    user.isRegistered = true;
    user.isApproved = false; // admin must approve
    await user.save();

    return res.status(201).json({
      success: true,
      message: 'Registration submitted. Waiting for admin approval.',
      user: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        aadharImage: user.aadharImage,
        isApproved: user.isApproved,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================
// GET PROFILE
// ======================================================
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-otp -__v');
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        aadharImage: user.aadharImage,
        isApproved: user.isApproved,
        isBlocked: user.isBlocked,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


