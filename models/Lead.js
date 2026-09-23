import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema(
  {
    partner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    clientName: { type: String, required: true, trim: true },
    clientEmail: { type: String, trim: true, lowercase: true },
    clientNumber: { type: String, required: true, trim: true },
    clientAddress: { type: String, trim: true },

    clientStatus: {
      type: String,
      enum: ['pending', 'converted', 'rejected'],
      default: 'pending',
    },

    projectName: { type: String, trim: true },
    budget: { type: Number },
    reference: { type: String, trim: true },
    timePeriod: { type: String, trim: true },
    startDate: { type: Date },

    projectType: {
      type: String,
      enum: ['app', 'website', 'digital_marketing'],
    },
  },
  { timestamps: true }
);

const Lead = mongoose.model('Lead', leadSchema);

export default Lead;