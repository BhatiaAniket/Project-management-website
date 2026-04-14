const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'under_review', 'completed', 'overdue'],
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    dueDate: {
      type: Date,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    // Additional fields for complete system
    assignedManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    estimatedHours: {
      type: Number,
      default: 0,
    },
    actualHours: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
      default: null,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    attachments: [{
      name: String,
      url: String,
      type: String,
      size: Number,
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    workLogs: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      description: {
        type: String,
        required: true,
      },
      hours: {
        type: Number,
        required: true,
      },
      date: {
        type: Date,
        default: Date.now,
      },
    }],
    comments: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      text: {
        type: String,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      mentions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }],
    }],
    // GitHub integration
    linkedRepo: {
      name: String,
      url: String,
      owner: String,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-set completedAt when status changes to completed
taskSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Task', taskSchema);
