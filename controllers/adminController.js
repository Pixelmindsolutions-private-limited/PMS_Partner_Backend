import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// ======================================================
// ADMIN LOGIN (static creds from .env)
// ======================================================
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email & password required' });

    if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign(
      { role: 'admin', email },
      process.env.ADMIN_JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      message: 'Admin login successful',
      token,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================
// APPROVE PARTNER
// ======================================================
export const approvePartner = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId)
      return res.status(400).json({ success: false, message: 'userId is required' });

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ success: false, message: 'Partner not found' });

    if (!user.isRegistered)
      return res.status(400).json({ success: false, message: 'Partner has not completed registration' });

    if (user.isApproved)
      return res.status(400).json({ success: false, message: 'Partner already approved' });

    user.isApproved = true;
    await user.save();

    return res.json({
      success: true,
      message: 'Partner approved successfully',
      user: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        isApproved: user.isApproved,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};