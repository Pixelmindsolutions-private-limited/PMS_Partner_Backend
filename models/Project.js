import mongoose from 'mongoose';

// =====================================================
// PROJECT LINK
// =====================================================

const projectLinkSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },

    url: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      trim: true,
      default: 'other',
    },
  },
  {
    _id: true,
  }
);

// =====================================================
// CLIENT PAYMENT / INSTALLMENT
// =====================================================

const clientPaymentSchema = new mongoose.Schema(
  {
    // Amount received from client
    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    // Payment method
    method: {
      type: String,
      enum: [
        'bank_transfer',
        'upi',
        'cash',
        'cheque',
        'other',
      ],
      default: 'other',
    },

    // NEFT / UPI / Cheque reference
    reference: {
      type: String,
      trim: true,
    },

    // Admin note
    note: {
      type: String,
      trim: true,
    },

    // When client actually paid
    receivedAt: {
      type: Date,
      default: Date.now,
    },

    // =================================================
    // COMMISSION GENERATED FROM THIS PAYMENT
    // =================================================

    commissionPaid: {
      type: Boolean,
      default: false,
    },

    commissionAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    _id: true,
    timestamps: true,
  }
);

// =====================================================
// COMMISSION PAYMENT RECORD
// =====================================================

const commissionPaymentSchema = new mongoose.Schema(
  {
    // Commission amount paid/credited
    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    // Which client payment generated this commission
    clientPaymentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    // Note
    note: {
      type: String,
      trim: true,
    },

    // Commission payment date
    paidAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
    timestamps: true,
  }
);

// =====================================================
// PARTNER EARNING
// =====================================================

const partnerEarningSchema = new mongoose.Schema(
  {
    // Total earning generated from this project
    amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Whether this earning has been credited to wallet
    isCredited: {
      type: Boolean,
      default: false,
    },

    // When earning was credited
    creditedAt: {
      type: Date,
      default: null,
    },

    // Optional note
    note: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    _id: false,
  }
);

// =====================================================
// PROJECT SCHEMA
// =====================================================

const projectSchema = new mongoose.Schema(
  {
    // =================================================
    // RELATIONSHIPS
    // =================================================

    // Original lead
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
    },

    // Partner/User who owns this project
    partner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // =================================================
    // CLIENT SNAPSHOT
    // =================================================

    clientName: {
      type: String,
      required: true,
      trim: true,
    },

    clientEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },

    clientNumber: {
      type: String,
      required: true,
      trim: true,
    },

    clientAddress: {
      type: String,
      trim: true,
    },

    // =================================================
    // PROJECT DETAILS
    // =================================================

    projectName: {
      type: String,
      trim: true,
    },

    projectType: {
      type: String,
      enum: [
        'app',
        'website',
        'digital_marketing',
      ],
    },

    reference: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    // =================================================
    // PROJECT BUDGET
    // =================================================

    // Total project value
    budget: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Total amount received from client
    totalPaid: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Remaining amount client has to pay
    balanceDue: {
      type: Number,
      default: 0,
      min: 0,
    },

    // =================================================
    // COMMISSION CONFIGURATION
    // =================================================

    // Partner commission percentage
    commissionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // Total commission possible for this project
    // Example:
    // Budget = 100000
    // Rate = 50%
    // Total commission = 50000
    totalCommission: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Commission already credited to partner
    commissionCredited: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Remaining commission
    commissionBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    // =================================================
    // PARTNER EARNING
    // =================================================

    partnerEarning: {
      type: partnerEarningSchema,
      default: () => ({
        amount: 0,
        isCredited: false,
        creditedAt: null,
        note: '',
      }),
    },

    // =================================================
    // CLIENT PAYMENT HISTORY
    // =================================================

    clientPayments: {
      type: [clientPaymentSchema],
      default: [],
    },

    // =================================================
    // COMMISSION PAYMENT HISTORY
    // =================================================

    commissionPayments: {
      type: [commissionPaymentSchema],
      default: [],
    },

    // =================================================
    // PROJECT TIMELINE
    // =================================================

    timePeriod: {
      type: String,
      trim: true,
    },

    startDate: {
      type: Date,
    },

    expectedEndDate: {
      type: Date,
    },

    // =================================================
    // REQUIREMENTS
    // =================================================

    requirements: {
      type: String,
      trim: true,
    },

    // =================================================
    // PROJECT STATUS
    // =================================================

    projectStatus: {
      type: String,
      enum: [
        'not_started',
        'in_progress',
        'on_hold',
        'completed',
        'cancelled',
      ],
      default: 'not_started',
    },

    // =================================================
    // PROJECT LINKS
    // =================================================

    projectLinks: {
      type: [projectLinkSchema],
      default: [],
    },

    // =================================================
    // CONVERSION
    // =================================================

    convertedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// =====================================================
// MODEL
// =====================================================

const Project = mongoose.model(
  'Project',
  projectSchema
);

export default Project;