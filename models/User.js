import mongoose from 'mongoose';

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

    // ---------- OTP (stored as Number) ----------
    otp: { type: Number, default: null },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

export default User;