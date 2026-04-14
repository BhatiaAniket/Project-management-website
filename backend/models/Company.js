const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Company location is required'],
      trim: true,
    },
    employeeCount: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '200+'],
      default: '1-10',
    },
    industry: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    // ── New fields ──
    logo: {
      type: String,
      default: null,
    },
    departments: [
      {
        type: String,
        trim: true,
      },
    ],

    onboarding: {
      companyRegistered: { type: Boolean, default: true },
      firstManagerAdded: { type: Boolean, default: false },
      firstEmployeeAdded: { type: Boolean, default: false },
      firstProjectCreated: { type: Boolean, default: false },
      firstMeetingScheduled: { type: Boolean, default: false },
    },
    holidays: [
      {
        name: String,
        date: Date,
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Company', companySchema);
