import mongoose from 'mongoose';

const withdrawalSchema = new mongoose.Schema(
  {
    // ============================
    // PARTNER
    // ============================
    partner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ============================
    // WITHDRAWAL AMOUNT
    // ============================
    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    // ============================
    // BANK DETAILS SNAPSHOT
    // Partner withdraw karte time
    // jo bank details use karega
    // ============================
    bankDetails: {
      accountHolderName: {
        type: String,
        required: true,
        trim: true,
      },

      bankName: {
        type: String,
        required: true,
        trim: true,
      },

      accountNumber: {
        type: String,
        required: true,
        trim: true,
      },

      ifscCode: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
      },
    },

    // ============================
    // UPI (optional)
    // ============================
    upiId: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },

    // ============================
    // STATUS
    // ============================
    status: {
      type: String,
      enum: ['pending', 'completed', 'rejected'],
      default: 'pending',
    },

    // ============================
    // ADMIN REJECTION
    // ============================
    rejectionReason: {
      type: String,
      trim: true,
      default: null,
    },

    // ============================
    // ADMIN PAYMENT DETAILS
    // ============================
    paymentReference: {
      type: String,
      trim: true,
      default: null,
    },

    paymentNote: {
      type: String,
      trim: true,
      default: null,
    },

    // ============================
    // IMPORTANT DATES
    // ============================
    requestedAt: {
      type: Date,
      default: Date.now,
    },

    processedAt: {
      type: Date,
      default: null,
    },

    paidAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);

export default Withdrawal;