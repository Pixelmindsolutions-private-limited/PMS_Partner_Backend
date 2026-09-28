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
        bankDetails: user.bankDetails,
        upiIds: user.upiIds,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getMyWallet = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('wallet');
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    return res.json({
      success: true,
      wallet: user.wallet || 0,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


// ======================================================
// GET MY WALLET TRANSACTIONS  →  GET + query
// ======================================================
export const getMyWalletTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.query;

    const user = await User.findById(userId).select('walletTransactions');
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    let list = [...user.walletTransactions].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    if (type) list = list.filter((t) => t.type === type);

    return res.json({
      success: true,
      count: list.length,
      transactions: list,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


// ======================================================
// HELPERS
// ======================================================
const isValidIfsc = (ifsc) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);
const isValidUpi = (upi) => /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upi);

// ======================================================
// BANK DETAILS
// ======================================================

// ---------- ADD BANK ----------
export const addBankDetail = async (req, res) => {
  try {
    const userId = req.user.id;

    const { accountHolderName, bankName, accountNumber, ifscCode, isPrimary } = req.body;

    if (!accountNumber || !ifscCode)
      return res.status(400).json({
        success: false,
        message: 'accountNumber and ifscCode are required',
      });

    if (!isValidIfsc(ifscCode.toUpperCase()))
      return res.status(400).json({
        success: false,
        message: 'Invalid IFSC code format',
      });

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    // duplicate account number check
    const exists = user.bankDetails.some((b) => b.accountNumber === accountNumber);
    if (exists)
      return res.status(400).json({
        success: false,
        message: 'This account number is already added',
      });

    // if this is primary, unset others
    if (isPrimary) user.bankDetails.forEach((b) => (b.isPrimary = false));

    user.bankDetails.push({
      accountHolderName,
      bankName,
      accountNumber,
      ifscCode: ifscCode.toUpperCase(),
      isPrimary: isPrimary || user.bankDetails.length === 0, // first one becomes primary
    });

    await user.save();

    return res.status(201).json({
      success: true,
      message: 'Bank detail added successfully',
      bankDetails: user.bankDetails,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ---------- GET ALL BANKS ----------
export const getBankDetails = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('bankDetails');
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    return res.json({
      success: true,
      count: user.bankDetails.length,
      bankDetails: user.bankDetails,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ---------- UPDATE BANK ----------
export const updateBankDetail = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bankDetailId, accountHolderName, bankName, accountNumber, ifscCode } = req.body;

    if (!bankDetailId)
      return res.status(400).json({ success: false, message: 'bankDetailId is required' });

    if (ifscCode && !isValidIfsc(ifscCode.toUpperCase()))
      return res.status(400).json({
        success: false,
        message: 'Invalid IFSC code format',
      });

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    const bank = user.bankDetails.id(bankDetailId);
    if (!bank)
      return res.status(404).json({ success: false, message: 'Bank detail not found' });

    if (accountHolderName !== undefined) bank.accountHolderName = accountHolderName;
    if (bankName !== undefined) bank.bankName = bankName;
    if (accountNumber !== undefined) bank.accountNumber = accountNumber;
    if (ifscCode !== undefined) bank.ifscCode = ifscCode.toUpperCase();

    await user.save();

    return res.json({
      success: true,
      message: 'Bank detail updated successfully',
      bankDetails: user.bankDetails,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ---------- SET PRIMARY BANK ----------
export const setPrimaryBank = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bankDetailId } = req.body;

    if (!bankDetailId)
      return res.status(400).json({ success: false, message: 'bankDetailId is required' });

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    const bank = user.bankDetails.id(bankDetailId);
    if (!bank)
      return res.status(404).json({ success: false, message: 'Bank detail not found' });

    user.bankDetails.forEach((b) => (b.isPrimary = false));
    bank.isPrimary = true;

    await user.save();

    return res.json({
      success: true,
      message: 'Primary bank updated',
      bankDetails: user.bankDetails,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ---------- DELETE BANK ----------
export const deleteBankDetail = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bankDetailId } = req.body;

    if (!bankDetailId)
      return res.status(400).json({ success: false, message: 'bankDetailId is required' });

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    const bank = user.bankDetails.id(bankDetailId);
    if (!bank)
      return res.status(404).json({ success: false, message: 'Bank detail not found' });

    const wasPrimary = bank.isPrimary;
    bank.deleteOne();

    // if we deleted the primary, promote the first remaining one
    if (wasPrimary && user.bankDetails.length > 0) {
      user.bankDetails[0].isPrimary = true;
    }

    await user.save();

    return res.json({
      success: true,
      message: 'Bank detail deleted successfully',
      bankDetails: user.bankDetails,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================
// UPI IDs
// ======================================================

// ---------- ADD UPI ----------
export const addUpiId = async (req, res) => {
  try {
    const userId = req.user.id;
    const { upiId, isPrimary } = req.body;

    if (!upiId)
      return res.status(400).json({ success: false, message: 'upiId is required' });

    const normalizedUpi = upiId.toLowerCase();

    if (!isValidUpi(normalizedUpi))
      return res.status(400).json({
        success: false,
        message: 'Invalid UPI ID format',
      });

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    const exists = user.upiIds.some((u) => u.upiId === normalizedUpi);
    if (exists)
      return res.status(400).json({
        success: false,
        message: 'This UPI ID is already added',
      });

    if (isPrimary) user.upiIds.forEach((u) => (u.isPrimary = false));

    user.upiIds.push({
      upiId: normalizedUpi,
      isPrimary: isPrimary || user.upiIds.length === 0,
    });

    await user.save();

    return res.status(201).json({
      success: true,
      message: 'UPI ID added successfully',
      upiIds: user.upiIds,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ---------- GET ALL UPIs ----------
export const getUpiIds = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('upiIds');
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    return res.json({
      success: true,
      count: user.upiIds.length,
      upiIds: user.upiIds,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ---------- UPDATE UPI ----------
export const updateUpiId = async (req, res) => {
  try {
    const userId = req.user.id;
    const { upiDocId, upiId } = req.body;

    if (!upiDocId)
      return res.status(400).json({ success: false, message: 'upiDocId is required' });

    if (!upiId)
      return res.status(400).json({ success: false, message: 'upiId is required' });

    const normalizedUpi = upiId.toLowerCase();

    if (!isValidUpi(normalizedUpi))
      return res.status(400).json({
        success: false,
        message: 'Invalid UPI ID format',
      });

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    const upi = user.upiIds.id(upiDocId);
    if (!upi)
      return res.status(404).json({ success: false, message: 'UPI ID not found' });

    // duplicate check (excluding itself)
    const exists = user.upiIds.some(
      (u) => u._id.toString() !== upiDocId && u.upiId === normalizedUpi
    );
    if (exists)
      return res.status(400).json({
        success: false,
        message: 'This UPI ID is already added',
      });

    upi.upiId = normalizedUpi;
    await user.save();

    return res.json({
      success: true,
      message: 'UPI ID updated successfully',
      upiIds: user.upiIds,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ---------- SET PRIMARY UPI ----------
export const setPrimaryUpi = async (req, res) => {
  try {
    const userId = req.user.id;
    const { upiDocId } = req.body;

    if (!upiDocId)
      return res.status(400).json({ success: false, message: 'upiDocId is required' });

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    const upi = user.upiIds.id(upiDocId);
    if (!upi)
      return res.status(404).json({ success: false, message: 'UPI ID not found' });

    user.upiIds.forEach((u) => (u.isPrimary = false));
    upi.isPrimary = true;

    await user.save();

    return res.json({
      success: true,
      message: 'Primary UPI updated',
      upiIds: user.upiIds,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ---------- DELETE UPI ----------
export const deleteUpiId = async (req, res) => {
  try {
    const userId = req.user.id;
    const { upiDocId } = req.body;

    if (!upiDocId)
      return res.status(400).json({ success: false, message: 'upiDocId is required' });

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    const upi = user.upiIds.id(upiDocId);
    if (!upi)
      return res.status(404).json({ success: false, message: 'UPI ID not found' });

    const wasPrimary = upi.isPrimary;
    upi.deleteOne();

    if (wasPrimary && user.upiIds.length > 0) {
      user.upiIds[0].isPrimary = true;
    }

    await user.save();

    return res.json({
      success: true,
      message: 'UPI ID deleted successfully',
      upiIds: user.upiIds,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};