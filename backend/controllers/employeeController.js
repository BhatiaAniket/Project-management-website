const mongoose = require('mongoose');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Meeting = require('../models/Meeting');
const DailyReport = require('../models/DailyReport');
const Notification = require('../models/Notification');
const ManagerRating = require('../models/ManagerRating');
const { emitToCompany, emitToUser } = require('../socket');
const toObjectId = require('../utils/toObjectId');
const { calculateEmployeeScore, getScoreLabel } = require('../services/performanceScore.service');
const { generateEmployeeAIReport } = require('../services/openai.service');

// ── OVERVIEW STATS ────────────────────────────────────────────────────────────
exports.getOverviewStats = async (req, res) => {
  try {
    const userId = toObjectId(req.user._id);
    const companyId = toObjectId(req.user.company);

    const [totalTasks, completedTasks, pendingTasks, overdueTasks, upcomingMeetings] = await Promise.all([
      Task.countDocuments({ assignedTo: userId, company: companyId }),
      Task.countDocuments({ assignedTo: userId, company: companyId, status: { $in: ['done', 'completed'] } }),
      Task.countDocuments({
        assignedTo: userId,
        company: companyId,
        status: { $in: ['todo', 'in_progress', 'under_review'] },
      }),
      Task.countDocuments({
        assignedTo: userId,
        company: companyId,
        status: { $nin: ['done', 'completed'] },
        dueDate: { $lt: new Date() },
      }),
      Meeting.countDocuments({ participants: userId, companyId, startTime: { $gte: new Date() } }),
    ]);

    return res.json({
      success: true,
      data: { totalTasks, completedTasks, pendingTasks, overdueTasks, upcomingMeetings },
    });
  } catch (error) {
    console.error('Employee overview stats error:', error);
    res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ── UPCOMING DEADLINES ────────────────────────────────────────────────────────
exports.getUpcomingDeadlines = async (req, res) => {
  try {
    const userId = toObjectId(req.user._id);
    const companyId = toObjectId(req.user.company);
    const tasks = await Task.find({
      assignedTo: userId,
      company: companyId,
      status: { $nin: ['done', 'completed'] },
      dueDate: { $gte: new Date() },
    })
      .populate('project', 'name')
      .sort({ dueDate: 1 })
      .limit(5);

    return res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ── UPCOMING MEETINGS ─────────────────────────────────────────────────────────
exports.getUpcomingMeetings = async (req, res) => {
  try {
    const userId = toObjectId(req.user._id);
    const companyId = toObjectId(req.user.company);
    const meetings = await Meeting.find({
      participants: userId,
      companyId,
      startTime: { $gte: new Date() },
    })
      .populate('createdBy', 'fullName')
      .sort({ startTime: 1 })
      .limit(3);

    return res.json({ success: true, data: meetings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ── GET TASKS (Kanban) ────────────────────────────────────────────────────────
exports.getTasks = async (req, res) => {
  try {
    const userId = toObjectId(req.user._id);
    const companyId = toObjectId(req.user.company);

    const tasks = await Task.find({ assignedTo: userId, company: companyId })
      .populate('project', 'name deadline status')
      .populate('assignedManager', 'fullName')
      .sort({ priority: 1, updatedAt: -1 });

    return res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ── UPDATE TASK STATUS ────────────────────────────────────────────────────────
exports.updateTaskStatus = async (req, res) => {
  try {
    const userId = toObjectId(req.user._id);
    const companyId = toObjectId(req.user.company);
    const { status } = req.body;

    const task = await Task.findOne({ _id: req.params.id, assignedTo: userId, company: companyId });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found or not assigned to you', errors: [] });

    const updateData = { status };
    if (status === 'completed') updateData.completedAt = new Date();

    const updatedTask = await Task.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .populate('assignedTo', 'fullName email avatar')
      .populate('project', 'name');

    if (task.assignedManager) {
      try {
        emitToUser(task.assignedManager.toString(), 'task:status_updated', {
          taskId: task._id,
          taskTitle: task.title,
          newStatus: status,
          updatedBy: req.user.fullName,
          projectId: task.project,
        });
        await Notification.create({
          company: companyId,
          user: task.assignedManager,
          title: 'Task Status Updated',
          message: `${req.user.fullName} moved "${task.title}" to ${status}`,
          type: 'task_updated',
          relatedId: task._id,
          relatedModel: 'Task',
        });
      } catch (e) {
        console.error('Socket/notification error:', e.message);
      }
    }

    try {
      emitToCompany(companyId.toString(), 'task:updated', {
        taskId: task._id,
        status,
        updatedBy: req.user.fullName,
      });
    } catch (e) {
      console.error('emitToCompany error:', e.message);
    }

    try {
      const { score } = await calculateEmployeeScore(userId, companyId);
      await User.findByIdAndUpdate(userId, { performanceScore: score });
      emitToUser(userId.toString(), 'score:updated', {
        userId: userId.toString(),
        newScore: score,
      });
    } catch (e) {
      console.error('Score recalc error:', e.message);
    }

    return res.json({ success: true, data: updatedTask });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ── GET DAILY REPORTS ─────────────────────────────────────────────────────────
exports.getDailyReports = async (req, res) => {
  try {
    const userId = toObjectId(req.user._id);
    const companyId = toObjectId(req.user.company);
    const reports = await DailyReport.find({ employee: userId, company: companyId })
      .populate('task', 'title')
      .populate('manager', 'fullName')
      .sort({ createdAt: -1 });
    return res.json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ── SUBMIT DAILY REPORT ───────────────────────────────────────────────────────
exports.submitDailyReport = async (req, res) => {
  try {
    const userId = toObjectId(req.user._id);
    const companyId = toObjectId(req.user.company);
    const { taskId, workSummary, hoursWorked, blockers, attachmentUrl } = req.body;

    if (!taskId || !workSummary) {
      return res.status(400).json({ success: false, message: 'taskId and workSummary are required', errors: [] });
    }

    const task = await Task.findOne({ _id: taskId, assignedTo: userId, company: companyId });
    if (!task) {
      return res.status(403).json({ success: false, message: 'Task not found or not assigned to you', errors: [] });
    }

    const managerId = task.assignedManager;

    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        let url;
        const cloudinary = (() => {
          try { return require('cloudinary').v2; } catch { return null; }
        })();

        if (cloudinary && process.env.CLOUDINARY_CLOUD_NAME) {
          try {
            const result = await cloudinary.uploader.upload(file.path, {
              folder: 'cognifypm/daily-reports',
              resource_type: 'auto',
            });
            url = result.secure_url;
          } catch (e) {
            console.error('Cloudinary upload error:', e.message);
            url = `/uploads/${file.filename}`;
          }
        } else {
          url = `/uploads/${file.filename}`;
        }

        attachments.push({
          fileName: file.filename,
          originalName: file.originalname,
          url,
          mimeType: file.mimetype,
          size: file.size,
        });
      }
    }

    const report = await DailyReport.create({
      company: companyId,
      employee: userId,
      task: taskId,
      manager: managerId,
      workSummary,
      hoursWorked: Number(hoursWorked) || 0,
      blockers: blockers || '',
      attachmentUrl: attachmentUrl || (attachments.length > 0 ? attachments[0].url : ''),
      attachments,
      status: 'pending_review',
    });

    if (managerId) {
      try {
        emitToUser(managerId.toString(), 'report:submitted', {
          reportId: report._id,
          employeeName: req.user.fullName,
          taskTitle: task.title,
          message: `${req.user.fullName} submitted a daily report for "${task.title}"`,
        });
        await Notification.create({
          company: companyId,
          user: managerId,
          title: 'New Daily Report',
          message: `${req.user.fullName} submitted a daily report for "${task.title}"`,
          type: 'general',
          relatedId: report._id,
        });
        emitToUser(managerId.toString(), 'notification');
      } catch (e) {
        console.error('Socket/notification error:', e.message);
      }
    }

    return res.status(201).json({ success: true, data: report });
  } catch (error) {
    console.error('Submit report error:', error);
    res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ── MEETINGS ──────────────────────────────────────────────────────────────────
exports.getMeetings = async (req, res) => {
  try {
    const userId = toObjectId(req.user._id);
    const companyId = toObjectId(req.user.company);
    const allMeetings = await Meeting.find({
      participants: userId,
      companyId,
    })
      .populate('createdBy participants', 'fullName avatar')
      .sort({ startTime: 1 });

    return res.json({ success: true, data: { meetings: allMeetings } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ── REQUEST MEETING ───────────────────────────────────────────────────────────
exports.requestMeeting = async (req, res) => {
  try {
    const userId = toObjectId(req.user._id);
    const companyId = toObjectId(req.user.company);
    const { title, description, date, recipientId } = req.body;

    await Notification.create({
      company: companyId,
      user: recipientId,
      title: 'Meeting Request',
      message: `${req.user.fullName} requested a meeting: "${title}" on ${new Date(date).toLocaleString()}`,
      type: 'general',
      relatedId: userId,
    });

    try {
      emitToUser(recipientId, 'notification');
    } catch (e) {
      console.error('Socket emit error:', e.message);
    }

    return res.json({ success: true, message: 'Meeting request sent' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ── PERFORMANCE (full data) ────────────────────────────────────────────────────
exports.getPerformance = async (req, res) => {
  try {
    const userId = toObjectId(req.user._id);
    const companyId = toObjectId(req.user.company);

    const { score, breakdown } = await calculateEmployeeScore(userId, companyId);

    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const start = new Date(d.setHours(0, 0, 0, 0));
      const end = new Date(new Date(start).setHours(23, 59, 59, 999));
      const completed = await Task.countDocuments({
        assignedTo: userId,
        status: 'completed',
        completedAt: { $gte: start, $lte: end },
      });
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      weeklyData.push({ day: days[start.getDay()], completed, date: start });
    }

    const monthlyTrend = [];
    for (let week = 3; week >= 0; week--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (week * 7 + 7));
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - week * 7);
      weekEnd.setHours(23, 59, 59, 999);

      const done = await Task.countDocuments({
        assignedTo: userId,
        status: 'completed',
        completedAt: { $gte: weekStart, $lte: weekEnd },
      });
      const total = await Task.countDocuments({
        assignedTo: userId,
        createdAt: { $lte: weekEnd },
      });
      monthlyTrend.push({
        week: `Week ${4 - week}`,
        score: total > 0 ? Math.round((done / total) * 1000) : 0,
      });
    }

    const taskStatusChart = {
      completedOnTime: breakdown.completedOnTime,
      completedLate: breakdown.completedLate,
      overdue: breakdown.overdue,
      inProgress: breakdown.inProgress,
    };

    const recentRatings = await ManagerRating.find({ employeeId: userId, company: companyId })
      .populate('managerId', 'fullName avatar')
      .populate('taskId', 'title')
      .sort({ createdAt: -1 })
      .limit(5);

    const totalTasks = breakdown.total;
    const doneTasks = breakdown.completedOnTime + breakdown.completedLate;
    const overdueTasks = breakdown.overdue;
    const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
    const tasksPerWeek = Array(8).fill(0);
    const completedTasksAll = await Task.find({
      assignedTo: userId,
      company: companyId,
      status: 'completed',
      completedAt: { $gte: eightWeeksAgo },
    }).select('completedAt updatedAt');

    completedTasksAll.forEach(task => {
      const completedDate = task.completedAt || task.updatedAt;
      const diffTime = new Date().getTime() - new Date(completedDate).getTime();
      const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
      if (diffWeeks < 8) tasksPerWeek[7 - diffWeeks]++;
    });

    return res.json({
      success: true,
      data: {
        score,
        breakdown,
        scoreLabel: getScoreLabel(score),
        weeklyData,
        monthlyTrend,
        taskStatusChart,
        recentRatings,
        tasksPerWeek,
        completionRate,
        totalTasks,
        doneTasks,
        overdueTasks,
      },
    });
  } catch (error) {
    console.error('Employee performance error:', error);
    res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ── EMPLOYEE AI PERFORMANCE REPORT ────────────────────────────────────────────
exports.getPerformanceAIReport = async (req, res) => {
  try {
    const userId = toObjectId(req.user._id);
    const companyId = toObjectId(req.user.company);

    const employee = await User.findById(userId).select(
      'fullName position lastAIReport lastAIReportAt'
    );

    const today = new Date().toDateString();
    if (employee.lastAIReportAt && employee.lastAIReportAt.toDateString() === today) {
      return res.json({
        success: true,
        data: {
          cached: true,
          report: employee.lastAIReport,
          generatedAt: employee.lastAIReportAt,
        },
      });
    }

    const { score, breakdown } = await calculateEmployeeScore(userId, companyId);

    const report = await generateEmployeeAIReport({
      name: employee.fullName,
      position: employee.position,
      score,
      breakdown,
    });

    await User.findByIdAndUpdate(userId, {
      lastAIReport: report,
      lastAIReportAt: new Date(),
    });

    return res.json({
      success: true,
      data: { cached: false, report, score, breakdown, generatedAt: new Date() },
    });
  } catch (error) {
    console.error('Employee AI report error:', error);
    res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ── COLLEAGUES ────────────────────────────────────────────────────────────────
exports.getColleagues = async (req, res) => {
  try {
    const companyId = toObjectId(req.user.company);
    const users = await User.find({ company: companyId, _id: { $ne: req.user._id } }).select(
      'fullName email role avatar'
    );
    return res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── MEETING REQUESTS HISTORY ──────────────────────────────────────────────────
exports.getMeetingRequests = async (req, res) => {
  try {
    const companyId = toObjectId(req.user.company);
    const requests = await Notification.find({
      company: companyId,
      user: req.user._id,
      type: 'general',
    })
      .sort({ createdAt: -1 })
      .limit(20);

    return res.json({ success: true, data: { requests, responses: [] } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
