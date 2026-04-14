const mongoose = require('mongoose');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Meeting = require('../models/Meeting');
const DailyReport = require('../models/DailyReport');
const Notification = require('../models/Notification');
const { emitToCompany, emitToUser } = require('../socket');

// Overview Stats
exports.getOverviewStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const companyId = req.companyId;

    const [totalTasks, completedTasks, pendingTasks, overdueTasks, upcomingMeetings] = await Promise.all([
      Task.countDocuments({ assignedTo: userId, company: companyId }),
      Task.countDocuments({ assignedTo: userId, company: companyId, status: 'completed' }),
      Task.countDocuments({ assignedTo: userId, company: companyId, status: { $in: ['todo', 'in_progress', 'under_review'] } }),
      Task.countDocuments({ assignedTo: userId, company: companyId, status: { $ne: 'completed' }, dueDate: { $lt: new Date() } }),
      Meeting.countDocuments({ participants: userId, companyId, startTime: { $gte: new Date() } })
    ]);

    return res.json({
      success: true,
      data: {
        totalTasks,
        completedTasks,
        pendingTasks,
        overdueTasks,
        upcomingMeetings
      }
    });
  } catch (error) {
    console.error('Employee overview stats error:', error);
    res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// Overview Deadlines
exports.getUpcomingDeadlines = async (req, res) => {
  try {
    const userId = req.user._id;
    const tasks = await Task.find({
      assignedTo: userId,
      status: { $ne: 'completed' },
      dueDate: { $gte: new Date() }
    })
      .populate('project', 'name')
      .sort({ dueDate: 1 })
      .limit(3);

    return res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// Overview Meetings
exports.getUpcomingMeetings = async (req, res) => {
  try {
    const userId = req.user._id;
    const meetings = await Meeting.find({
      participants: userId,
      startTime: { $gte: new Date() }
    })
      .populate('createdBy', 'fullName')
      .sort({ startTime: 1 })
      .limit(2);

    return res.json({ success: true, data: meetings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// Tasks List (Kanban)
exports.getTasks = async (req, res) => {
  try {
    const userId = req.user._id;
    const tasks = await Task.find({ assignedTo: userId, company: req.companyId })
      .populate('project', 'name')
      .populate('assignedManager', 'fullName') // Needs to fallback if manager is not attached explicitly
      .sort({ updatedAt: -1 });

    return res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// Update Task Status (Drag and Drop / Mark as Done)
exports.updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, assignedTo: req.user._id },
      { status },
      { new: true }
    );
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    // Emit event
    try {
      emitToCompany(req.companyId, 'task:updated', { taskId: task._id, status: task.status });
    } catch (e) { }

    return res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// Get Daily Reports
exports.getDailyReports = async (req, res) => {
  try {
    const reports = await DailyReport.find({ employee: req.user._id, company: req.companyId })
      .populate('task', 'title')
      .populate('manager', 'fullName')
      .sort({ createdAt: -1 });
    return res.json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// Submit Daily Report
exports.submitDailyReport = async (req, res) => {
  try {
    const { taskId, workSummary, hoursWorked, blockers, attachmentUrl } = req.body;

    // Find task to get manager
    const task = await Task.findById(taskId).populate('project');
    if (!task || task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Task not found or not authorized' });
    }

    const managerId = task.assignedManager || task.project.manager;

    const report = await DailyReport.create({
      company: req.companyId,
      employee: req.user._id,
      task: taskId,
      manager: managerId,
      workSummary,
      hoursWorked,
      blockers,
      attachmentUrl
    });

    try {
      emitToUser(managerId.toString(), 'report:submitted', { reportId: report._id });
      // Notify manager via notifications
      await Notification.create({
        company: req.companyId,
        user: managerId,
        title: 'New Daily Report',
        message: `${req.user.fullName} submitted a daily report for "${task.title}"`,
        type: 'report',
        read: false
      });
      emitToUser(managerId.toString(), 'notification');
    } catch (e) { }

    return res.status(201).json({ success: true, data: report });
  } catch (error) {
    console.error('Submit report error:', error);
    res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// Meetings - Get All
exports.getMeetings = async (req, res) => {
  try {
    const now = new Date();
    const upcoming = await Meeting.find({
      participants: req.user._id,
      companyId: req.companyId,
      startTime: { $gte: now }
    }).populate('createdBy participants', 'fullName avatar').sort({ startTime: 1 });

    return res.json({ success: true, data: upcoming });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// Request Meeting
exports.requestMeeting = async (req, res) => {
  try {
    // Basic request saving via notifications/request specific table
    // For simplicity we create a 'meeting_request' notification to the manager
    const { title, description, date, recipientId } = req.body;

    await Notification.create({
      company: req.companyId,
      user: recipientId,
      title: 'Meeting Request',
      message: `${req.user.fullName} requested a meeting: "${title}" on ${new Date(date).toLocaleString()}`,
      metadata: { originalRequest: req.body, requesterId: req.user._id },
      type: 'meeting_request'
    });

    try {
      emitToUser(recipientId, 'notification');
    } catch (e) { }

    return res.json({ success: true, message: 'Meeting request sent' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// Performance
exports.getPerformance = async (req, res) => {
  try {
    const userId = req.user._id;

    // 8 weeks bar chart data (mocked slightly via dynamic DB if needed)
    // Actually we just fetch tasks done in last 8 weeks
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const completedTasks = await Task.find({
      assignedTo: userId,
      status: 'completed',
      completedAt: { $gte: eightWeeksAgo }
    });

    const tasksPerWeek = Array(8).fill(0);
    completedTasks.forEach(task => {
      const diffTime = Math.abs(new Date().getTime() - new Date(task.completedAt).getTime());
      const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
      if (diffWeeks < 8) tasksPerWeek[7 - diffWeeks]++; // 7 is current week
    });

    const totalTasks = await Task.countDocuments({ assignedTo: userId });
    const doneTasks = await Task.countDocuments({ assignedTo: userId, status: 'completed' });
    const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    return res.json({
      success: true,
      data: {
        tasksPerWeek,
        completionRate,
        totalTasks,
        doneTasks
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// Colleagues
exports.getColleagues = async (req, res) => {
  try {
    const users = await User.find({ company: req.companyId, _id: { $ne: req.user._id } })
      .select('fullName email role avatar');
    return res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Meeting Requests History
exports.getMeetingRequests = async (req, res) => {
  try {
    const requests = await Notification.find({
      company: req.companyId,
      'metadata.requesterId': req.user._id,
      type: 'meeting_request'
    }).sort({ createdAt: -1 });

    // Also get acceptances/declines sent to me
    const responses = await Notification.find({
      user: req.user._id,
      type: 'meeting'
    }).sort({ createdAt: -1 });

    return res.json({ success: true, data: { requests, responses } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
