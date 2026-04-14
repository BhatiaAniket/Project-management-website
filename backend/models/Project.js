const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    team: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    startDate: {
      type: Date,
      default: Date.now,
    },
    deadline: {
      type: Date,
      required: [true, 'Project deadline is required'],
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'on_hold', 'archived'],
      default: 'not_started',
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    isTemplate: {
      type: Boolean,
      default: false,
    },
    files: [
      {
        name: String,
        url: String,
        type: String,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    remindersSent: {
      sevenDay: { type: Boolean, default: false },
      threeDay: { type: Boolean, default: false },
      oneDay: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

// Calculate progress based on tasks
projectSchema.methods.calculateProgress = async function () {
  const Task = mongoose.model('Task');
  const tasks = await Task.find({ project: this._id });
  if (tasks.length === 0) return 0;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  this.progress = Math.round((completed / tasks.length) * 100);
  await this.save();
  return this.progress;
};

module.exports = mongoose.model('Project', projectSchema);
