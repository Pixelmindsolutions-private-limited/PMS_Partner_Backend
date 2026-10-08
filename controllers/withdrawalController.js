import Withdrawal from '../models/Withdrawal.js';
import User from '../models/User.js';
import Project from '../models/Project.js';

// ==========================================
// PARTNER REQUEST WITHDRAWAL
// POST /api/partner/withdrawals
// ==========================================
export const requestWithdrawal = async (req, res) => {
  try {
    const partnerId = req.user.id;

    const {
      amount,
      bankDetails,
      upiId,
    } = req.body;

    // --------------------------------------
    // VALIDATION
    // --------------------------------------
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid withdrawal amount is required',
      });
    }

    if (!bankDetails) {
      return res.status(400).json({
        success: false,
        message: 'Bank details are required',
      });
    }

    const {
      accountHolderName,
      bankName,
      accountNumber,
      ifscCode,
    } = bankDetails;

    if (
      !accountHolderName ||
      !bankName ||
      !accountNumber ||
      !ifscCode
    ) {
      return res.status(400).json({
        success: false,
        message: 'Complete bank details are required',
      });
    }

    // --------------------------------------
    // FIND PARTNER
    // --------------------------------------
    const partner = await User.findById(partnerId);

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found',
      });
    }

    // --------------------------------------
    // CHECK WALLET
    // --------------------------------------
    if (amount > partner.wallet) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance',
        walletBalance: partner.wallet,
      });
    }

    // --------------------------------------
    // CHECK PENDING WITHDRAWALS
    // --------------------------------------
    const pendingWithdrawals = await Withdrawal.aggregate([
      {
        $match: {
          partner: partner._id,
          status: 'pending',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    const pendingAmount =
      pendingWithdrawals.length > 0
        ? pendingWithdrawals[0].total
        : 0;

    const availableAmount =
      partner.wallet - pendingAmount;

    if (amount > availableAmount) {
      return res.status(400).json({
        success: false,
        message: 'Amount is already reserved in pending withdrawals',
        availableAmount,
      });
    }

    // --------------------------------------
    // CREATE WITHDRAWAL
    // --------------------------------------
    const withdrawal = await Withdrawal.create({
      partner: partnerId,
      amount,

      bankDetails: {
        accountHolderName,
        bankName,
        accountNumber,
        ifscCode,
      },

      upiId: upiId || null,

      status: 'pending',

      requestedAt: new Date(),
    });

    // --------------------------------------
    // NOTIFICATION
    // --------------------------------------
    partner.notifications.push({
      title: 'Withdrawal Requested',
      message: `Your withdrawal request of ₹${amount} has been submitted successfully.`,
      type: 'info',
      referenceId: withdrawal._id,
      isRead: false,
    });

    await partner.save();

    return res.status(201).json({
      success: true,
      message:
        'Withdrawal request submitted successfully. Your amount will be processed within 24 hours.',
      data: withdrawal,
    });
  } catch (error) {
    console.error('Request Withdrawal Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
// ==========================================
// PARTNER WALLET SUMMARY
// GET /api/partner/wallet/summary
// ==========================================
export const getWalletSummary = async (req, res) => {
  try {
    const partnerId = req.user.id;

    const partner = await User.findById(partnerId).select(
      'name mobile email wallet'
    );

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found',
      });
    }

    // --------------------------------------
    // TOTAL PAYMENT
    // Project commission/payment data se
    // --------------------------------------

    const projects = await Project.find({
      partner: partnerId,
    }).select('totalPaid');

    const totalPayment = projects.reduce(
      (sum, project) => sum + (project.totalPaid || 0),
      0
    );

    // --------------------------------------
    // WALLET
    // --------------------------------------
    const wallet = partner.wallet || 0;

    // --------------------------------------
    // TOTAL REVENUE
    // --------------------------------------
    const totalRevenue = totalPayment + wallet;

    return res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        totalPayment,
        wallet,
      },
    });
  } catch (error) {
    console.error('Wallet Summary Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
// ==========================================
// GET MY WITHDRAWALS
// GET /api/partner/withdrawals
// ==========================================
export const getMyWithdrawals = async (req, res) => {
  try {
    const partnerId = req.user.id;

    const withdrawals = await Withdrawal.find({
      partner: partnerId,
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: withdrawals.length,
      data: withdrawals,
    });
  } catch (error) {
    console.error('Get My Withdrawals Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// GET PARTNER WALLET
// GET /api/partner/wallet hina
export const getWallet = async (req, res) => {
  try {
    const partnerId = req.user.id;

    const partner = await User.findById(partnerId).select(
      'name mobile email wallet walletTransactions'
    );

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        partnerId: partner._id,
        name: partner.name,
        wallet: partner.wallet || 0,
        walletTransactions: partner.walletTransactions || [],
      },
    });
  } catch (error) {
    console.error('Get Wallet Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// ==========================================
// GET PARTNER DASHBOARD SUMMARY
// GET /api/partner/dashboard
// ==========================================
export const getPartnerAmount = async (req, res) => {
  try {
    const partnerId = req.user.id;

    // Get partner target money
    const partner = await User.findById(partnerId).select(
      'name targetMoney'
    );

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found',
      });
    }

    // Get partner projects
    const projects = await Project.find({
      partner: partnerId,
    }).select('budget totalPaid balanceDue');

    // Total project revenue
    const totalRevenue = projects.reduce(
      (total, project) => total + (project.budget || 0),
      0
    );

    // Total pending / on progress amount
    const onProgressAmount = projects.reduce(
      (total, project) => total + (project.balanceDue || 0),
      0
    );

    return res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        onProgressAmount,
        targetMoney: partner.targetMoney || 0,
      },
    });
  } catch (error) {
    console.error('Get Partner Dashboard Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// controllers/partnerController.js

export const getRecentTransactions = async (req, res) => {
  try {
    const partnerId = req.user.id;

    const partner = await User.findById(partnerId).select(
      'wallet walletTransactions'
    );

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found',
      });
    }

    const transactions = [...(partner.walletTransactions || [])]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    return res.status(200).json({
      success: true,
      data: {
        wallet: partner.wallet,
        transactions,
      },
    });
  } catch (error) {
    console.error('Get Recent Transactions Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
