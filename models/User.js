import mongoose from 'mongoose';


const bankDetailSchema = new mongoose.Schema(
  {
    accountHolderName: { type: String, trim: true },
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifscCode: { type: String, trim: true, uppercase: true },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: true }
);

const upiIdSchema = new mongoose.Schema(
  {
    upiId: { type: String, trim: true, lowercase: true },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: true }
);

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, trim: true },

    type: {
      type: String,
      enum: [
            'lead_added',
            'lead_converted',
            'project_status_updated',
            'wallet_credited',
            'wallet_debited',
            'info',
          ],
      required: true,
    },

    // points to Lead._id / Project._id etc.
    // null for generic 'info' notifications
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    isRead: { type: Boolean, default: false },
  },
  { _id: true, timestamps: true }
);

const walletTransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    balanceAfter: { type: Number, required: true },
  },
  { _id: true, timestamps: true }
);



const userSchema = new mongoose.Schema(
  {
    // ---------- identity ----------
    name: { type: String, trim: true },
    mobile: { type: String, required: true, unique: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    aadharImage: { type: String },

    // ---------- registration / approval ----------
    isRegistered: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },

    wallet: { type: Number, default: 0, min: 0 },
    walletTransactions: [walletTransactionSchema],

    bankDetails: [bankDetailSchema],
    upiIds: [upiIdSchema],
    notifications: [notificationSchema],
    
    // ---------- OTP (stored as Number) ----------
    otp: { type: Number, default: null },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

export default User;