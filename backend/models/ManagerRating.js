const mongoose = require('mongoose');

const managerRatingSchema = new mongoose.Schema(
  {
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    comment: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      enum: ['quality', 'timeliness', 'communication', 'overall'],
      default: 'overall',
    },
  },
  { timestamps: true }
);

// One rating per manager per task (upsert pattern)
managerRatingSchema.index({ managerId: 1, employeeId: 1, taskId: 1 }, { unique: true });
managerRatingSchema.index({ employeeId: 1, company: 1 });
managerRatingSchema.index({ managerId: 1, company: 1 });

module.exports = mongoose.model('ManagerRating', managerRatingSchema);
