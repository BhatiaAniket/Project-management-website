const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    // Sharing options
    sharedWith: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    readBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      readAt: {
        type: Date,
        default: Date.now,
      }
    }],
    sharedWithProject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    sharedWithGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      default: null,
    },
    linkedTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
    category: {
      type: String,
      enum: ['document', 'image', 'code', 'spreadsheet', 'other'],
      default: 'other',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    tags: [{
      type: String,
      trim: true,
    }],
    isPublic: {
      type: Boolean,
      default: false,
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
fileSchema.index({ company: 1, uploadedBy: 1 });
fileSchema.index({ company: 1, sharedWith: 1 });
fileSchema.index({ company: 1, sharedWithProject: 1 });
fileSchema.index({ company: 1, linkedTask: 1 });

module.exports = mongoose.model('File', fileSchema);
