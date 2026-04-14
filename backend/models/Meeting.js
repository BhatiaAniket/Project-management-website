const mongoose = require('mongoose');
const crypto = require('crypto');

const meetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Meeting title is required'],
      trim: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    startTime: {
      type: Date,
      required: [true, 'Meeting start time is required'],
    },
    durationMinutes: {
      type: Number, // in minutes
      default: 30,
      required: true,
    },
    agenda: {
      type: String,
      trim: true,
      default: '',
    },
    type: {
      type: String,
      enum: ['one-on-one', 'team', 'standup', 'review'],
      default: 'one-on-one',
    },
    summary: {
      keyPoints: [String],
      actionItems: [String],
      decisions: [String],
      rawSummary: String,
    },
    roomId: {
      type: String,
      unique: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'active', 'ended', 'cancelled'],
      default: 'scheduled',
    },
    transcript: {
      type: String,
      default: '',
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate roomId before saving
meetingSchema.pre('save', function (next) {
  if (!this.roomId) {
    this.roomId = crypto.randomBytes(16).toString('hex');
  }
  next();
});

module.exports = mongoose.model('Meeting', meetingSchema);
