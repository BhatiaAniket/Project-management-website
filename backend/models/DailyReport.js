const mongoose = require('mongoose');

const dailyReportSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    workSummary: {
      type: String,
      required: true,
      trim: true,
    },
    hoursWorked: {
      type: Number,
      required: true,
      min: 0,
    },
    blockers: {
      type: String,
      trim: true,
      default: '',
    },
    // Legacy single-URL field (kept for backward compat)
    attachmentUrl: {
      type: String,
      default: '',
    },
    // Rich attachments array — populated when file upload middleware is used
    attachments: [
      {
        fileName: String,
        originalName: String,
        url: String,
        mimeType: String,
        size: Number,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ['pending_review', 'approved', 'needs_revision'],
      default: 'pending_review',
    },
    managerComment: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
dailyReportSchema.index({ company: 1, employee: 1 });
dailyReportSchema.index({ company: 1, manager: 1 });
dailyReportSchema.index({ task: 1 });

module.exports = mongoose.model('DailyReport', dailyReportSchema);
