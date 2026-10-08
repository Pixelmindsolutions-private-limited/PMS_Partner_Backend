import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Banner from '../models/Banners.js';
import Project from '../models/Project.js';
import Withdrawal from '../models/Withdrawal.js';


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



export const addMoneyToWallet = async (req, res) => {
  try {
    const { userId, amount, description } = req.body;

    if (!userId)
      return res.status(400).json({ success: false, message: 'userId is required' });

    const amt = Number(amount);
    if (!amt || amt <= 0)
      return res.status(400).json({
        success: false,
        message: 'amount must be a positive number',
      });

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ success: false, message: 'Partner not found' });

    const newBalance = (user.wallet || 0) + amt;

    user.wallet = newBalance;
    user.walletTransactions.push({
      type: 'credit',
      amount: amt,
      description: description || 'Wallet credit by admin',
      referenceId: null,
      balanceAfter: newBalance,
    });

    user.notifications.push({
      type: 'wallet_credited',
      title: 'Wallet credited',
      message: `₹${amt} has been added to your wallet. New balance: ₹${newBalance}`,
      referenceId: null,
      isRead: false,
    });

    await user.save();

    return res.json({
      success: true,
      message: 'Money added to wallet',
      wallet: user.wallet,
      transaction: user.walletTransactions[user.walletTransactions.length - 1],
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================
// DEDUCT MONEY FROM WALLET (admin)
// ======================================================
export const deductMoneyFromWallet = async (req, res) => {
  try {
    const { userId, amount, description } = req.body;

    if (!userId)
      return res.status(400).json({ success: false, message: 'userId is required' });

    const amt = Number(amount);
    if (!amt || amt <= 0)
      return res.status(400).json({
        success: false,
        message: 'amount must be a positive number',
      });

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ success: false, message: 'Partner not found' });

    const currentBalance = user.wallet || 0;
    if (currentBalance < amt)
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance. Current: ₹${currentBalance}`,
      });

    const newBalance = currentBalance - amt;

    user.wallet = newBalance;
    user.walletTransactions.push({
      type: 'debit',
      amount: amt,
      description: description || 'Wallet debit by admin',
      referenceId: null,
      balanceAfter: newBalance,
    });

    user.notifications.push({
      type: 'wallet_debited',
      title: 'Wallet debited',
      message: `₹${amt} has been deducted from your wallet. New balance: ₹${newBalance}`,
      referenceId: null,
      isRead: false,
    });

    await user.save();

    return res.json({
      success: true,
      message: 'Money deducted from wallet',
      wallet: user.wallet,
      transaction: user.walletTransactions[user.walletTransactions.length - 1],
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};



// ======================================================
// HELPER — build full URL from request
// ======================================================
const buildFileUrl = (req, subfolder, filename) =>
  `${req.protocol}://${req.get('host')}/uploads/${subfolder}/${filename}`;

// ======================================================
// CREATE BANNER
// ======================================================
export const createBanner = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!req.file)
      return res.status(400).json({ success: false, message: 'Image is required' });

    const imageUrl = buildFileUrl(req, 'banners', req.file.filename);

    const banner = await Banner.create({
      title,
      description,
      image: imageUrl,
    });

    return res.status(201).json({
      success: true,
      message: 'Banner created successfully',
      banner,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================
// GET ALL BANNERS
// ======================================================
export const getAllBanners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: banners.length,
      banners,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================
// GET BANNER BY ID
// ======================================================
export const getBannerById = async (req, res) => {
  try {
    const { bannerId } = req.body;

    if (!bannerId)
      return res.status(400).json({ success: false, message: 'bannerId is required' });

    const banner = await Banner.findById(bannerId);
    if (!banner)
      return res.status(404).json({ success: false, message: 'Banner not found' });

    return res.json({ success: true, banner });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================
// UPDATE BANNER
// ======================================================
export const updateBanner = async (req, res) => {
  try {
    const { bannerId, title, description } = req.body;

    if (!bannerId)
      return res.status(400).json({ success: false, message: 'bannerId is required' });

    const banner = await Banner.findById(bannerId);
    if (!banner)
      return res.status(404).json({ success: false, message: 'Banner not found' });

    if (title !== undefined) banner.title = title;
    if (description !== undefined) banner.description = description;

    // replace image only if a new file is uploaded
    if (req.file) {
      banner.image = buildFileUrl(req, 'banners', req.file.filename);
    }

    await banner.save();

    return res.json({
      success: true,
      message: 'Banner updated successfully',
      banner,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================
// DELETE BANNER
// ======================================================
export const deleteBanner = async (req, res) => {
  try {
    const { bannerId } = req.body;

    if (!bannerId)
      return res.status(400).json({ success: false, message: 'bannerId is required' });

    const banner = await Banner.findById(bannerId);
    if (!banner)
      return res.status(404).json({ success: false, message: 'Banner not found' });

    await banner.deleteOne();

    return res.json({
      success: true,
      message: 'Banner deleted successfully',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


// ======================================================
// SET COMMISSION RATE
// ======================================================
export const setCommissionRate = async (req, res) => {
  try {
    const { projectId, commissionRate } = req.body;

    if (!projectId)
      return res.status(400).json({ success: false, message: 'projectId is required' });

    const rate = Number(commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100)
      return res.status(400).json({
        success: false,
        message: 'commissionRate must be between 0 and 100',
      });

    const project = await Project.findById(projectId);
    if (!project)
      return res.status(404).json({ success: false, message: 'Project not found' });

    project.commissionRate = rate;
    project.totalCommission = Math.round(((project.budget || 0) * rate) / 100);
    project.commissionBalance = Math.max(
      project.totalCommission - (project.commissionCredited || 0),
      0
    );

    await project.save();

    return res.json({
      success: true,
      message: 'Commission rate updated',
      project,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================
// ADD CLIENT PAYMENT (installment)
// ======================================================
export const addClientPayment = async (req, res) => {
  try {
    const {
      projectId,
      amount,
      method,
      reference,
      note,
      receivedAt,
      commissionPaid = true,
    } = req.body;

    if (!projectId)
      return res.status(400).json({ success: false, message: 'projectId is required' });

    const amt = Number(amount);
    if (!amt || amt <= 0)
      return res.status(400).json({
        success: false,
        message: 'amount must be a positive number',
      });

    const project = await Project.findById(projectId);
    if (!project)
      return res.status(404).json({ success: false, message: 'Project not found' });

    if (project.projectStatus === 'cancelled')
      return res.status(400).json({
        success: false,
        message: 'Cannot add payment to a cancelled project',
      });

    // ---------- overpayment guard ----------
    const remaining = (project.budget || 0) - (project.totalPaid || 0);
    if (amt > remaining)
      return res.status(400).json({
        success: false,
        message: `Payment exceeds remaining balance. Remaining: ₹${remaining}`,
      });

    // ---------- commission calc ----------
    const commissionAmount =
      commissionPaid && project.commissionRate > 0
        ? Math.round((amt * project.commissionRate) / 100)
        : 0;

    // ---------- 1. push installment ----------
    project.clientPayments.push({
      amount: amt,
      method: method || 'other',
      reference: reference || '',
      note: note || '',
      receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
      commissionPaid: commissionAmount > 0,
      commissionAmount,
    });

    const savedPayment = project.clientPayments[project.clientPayments.length - 1];

    // ---------- 2. update client totals ----------
    project.totalPaid = (project.totalPaid || 0) + amt;
    project.balanceDue = Math.max((project.budget || 0) - project.totalPaid, 0);

    // ---------- 3. commission payout + wallet credit ----------
    if (commissionAmount > 0) {
      project.commissionPayments.push({
        amount: commissionAmount,
        clientPaymentId: savedPayment._id,
        note: `Commission for installment of ₹${amt}`,
        paidAt: new Date(),
      });

      project.commissionCredited =
        (project.commissionCredited || 0) + commissionAmount;

      project.commissionBalance = Math.max(
        (project.totalCommission || 0) - project.commissionCredited,
        0
      );

      // credit partner wallet
      const partner = await User.findById(project.partner);
      if (partner) {
        partner.wallet = (partner.wallet || 0) + commissionAmount;

        partner.walletTransactions.push({
          type: 'credit',
          amount: commissionAmount,
          description: `Commission for project "${project.projectName || project.clientName}"`,
          referenceId: project._id,
          balanceAfter: partner.wallet,
        });

        partner.notifications.push({
          type: 'wallet_credited',
          title: 'Commission credited',
          message: `₹${commissionAmount} commission credited for project "${project.projectName || project.clientName}". New balance: ₹${partner.wallet}`,
          referenceId: project._id,
          isRead: false,
        });

        await partner.save();
      }
    }

    await project.save();

    return res.status(201).json({
      success: true,
      message:
        commissionAmount > 0
          ? `Installment recorded. ₹${commissionAmount} commission credited to partner.`
          : 'Installment recorded.',
      project,
      commissionAmount,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================
// GET PROJECT PAYMENT DETAILS
// ======================================================
export const getProjectPayments = async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId)
      return res.status(400).json({ success: false, message: 'projectId is required' });

    const project = await Project.findById(projectId).select(
      'projectName clientName budget totalPaid balanceDue commissionRate totalCommission commissionCredited commissionBalance clientPayments commissionPayments'
    );

    if (!project)
      return res.status(404).json({ success: false, message: 'Project not found' });

    return res.json({
      success: true,
      project: {
        projectName: project.projectName,
        clientName: project.clientName,

        clientSide: {
          budget: project.budget,
          totalPaid: project.totalPaid,
          balanceDue: project.balanceDue,
        },

        commissionSide: {
          commissionRate: project.commissionRate,
          totalCommission: project.totalCommission,
          commissionCredited: project.commissionCredited,
          commissionBalance: project.commissionBalance,
        },

        installments: project.clientPayments,
        commissionPayments: project.commissionPayments,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-otp')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getPartnersByStatus = async (req, res) => {
  try {
    const { status } = req.query;

    let filter = {};

    if (status === "pending") {
      filter = {
        isApproved: false,
        isBlocked: false,
      };
    } 
    else if (status === "active") {
      filter = {
        isApproved: true,
        isBlocked: false,
      };
    } 
    else if (status === "blocked") {
      filter = {
        isBlocked: true,
      };
    } 
    else {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Use pending, active or blocked",
      });
    }

    const users = await User.find(filter)
      .select("-otp")
      .sort({ createdAt: -1 });

    const partners = users.map((user) => ({
      id: user._id,
      name: user.name,
      mobile: user.mobile,
      email: user.email,
      aadharImage: user.aadharImage,
      isRegistered: user.isRegistered,
      isApproved: user.isApproved,
      isBlocked: user.isBlocked,
      status: user.isBlocked
        ? "blocked"
        : user.isApproved
        ? "active"
        : "pending",
      wallet: user.wallet,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      status,
      count: partners.length,
      data: partners,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
// ==========================================
// ADMIN GET ALL WITHDRAWALS
// GET /api/admin/withdrawals
// ==========================================
export const getAllWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find()
      .populate('partner', 'name mobile email')
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: withdrawals.length,
      data: withdrawals,
    });
  } catch (error) {
    console.error('Get All Withdrawals Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// ==========================================
// ADMIN GET WITHDRAWAL BY ID
// GET /api/admin/withdrawals/:id
// ==========================================
export const getWithdrawalById = async (req, res) => {
  try {
    const { id } = req.params;

    const withdrawal = await Withdrawal.findById(id)
      .populate('partner', 'name mobile email');

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: withdrawal,
    });
  } catch (error) {
    console.error('Get Withdrawal By ID Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
// ==========================================
// ADMIN APPROVE WITHDRAWAL
// PUT /api/admin/withdrawals/:id/approve
// ==========================================
export const approveWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      paymentReference,
      paymentNote,
    } = req.body;

    const withdrawal = await Withdrawal.findById(id);

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal not found',
      });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Withdrawal is already ${withdrawal.status}`,
      });
    }

    const partner = await User.findById(withdrawal.partner);

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found',
      });
    }

    // --------------------------------------
    // DEDUCT FROM WALLET
    // --------------------------------------
    if (partner.wallet < withdrawal.amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance',
      });
    }

    partner.wallet -= withdrawal.amount;

    // --------------------------------------
    // WALLET TRANSACTION
    // --------------------------------------
    partner.walletTransactions.push({
      type: 'debit',
      amount: withdrawal.amount,
      description: `Withdrawal of ₹${withdrawal.amount}`,
      referenceId: withdrawal._id,
      balanceAfter: partner.wallet,
    });

    // --------------------------------------
    // UPDATE WITHDRAWAL
    // --------------------------------------
    withdrawal.status = 'completed';

    withdrawal.paymentReference =
      paymentReference || null;

    withdrawal.paymentNote =
      paymentNote || null;

    withdrawal.processedAt = new Date();
    withdrawal.paidAt = new Date();

    // --------------------------------------
    // NOTIFICATION
    // --------------------------------------
    partner.notifications.push({
      title: 'Withdrawal Approved',
      message: `Your withdrawal request of ₹${withdrawal.amount} has been approved. Your amount will be paid within 24 hours.`,
      type: 'wallet_debited',
      referenceId: withdrawal._id,
      isRead: false,
    });

    await partner.save();
    await withdrawal.save();

    return res.status(200).json({
      success: true,
      message: 'Withdrawal approved successfully',
      data: withdrawal,
    });
  } catch (error) {
    console.error('Approve Withdrawal Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// ==========================================
// ADMIN REJECT WITHDRAWAL
// PUT /api/admin/withdrawals/:id/reject
// ==========================================
export const rejectWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required',
      });
    }

    const withdrawal = await Withdrawal.findById(id);

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal not found',
      });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Withdrawal is already ${withdrawal.status}`,
      });
    }

    const partner = await User.findById(withdrawal.partner);

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found',
      });
    }

    // --------------------------------------
    // UPDATE WITHDRAWAL
    // --------------------------------------
    withdrawal.status = 'rejected';

    withdrawal.rejectionReason =
      rejectionReason.trim();

    withdrawal.processedAt = new Date();

    // --------------------------------------
    // NOTIFICATION
    // --------------------------------------
    partner.notifications.push({
      title: 'Withdrawal Rejected',
      message: `Your withdrawal request of ₹${withdrawal.amount} has been rejected. Reason: ${rejectionReason}`,
      type: 'info',
      referenceId: withdrawal._id,
      isRead: false,
    });

    await partner.save();
    await withdrawal.save();

    return res.status(200).json({
      success: true,
      message: 'Withdrawal rejected successfully',
      data: withdrawal,
    });
  } catch (error) {
    console.error('Reject Withdrawal Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};