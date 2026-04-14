const mongoose = require("mongoose");
const Project = require("../models/Project");
const Task = require("../models/Task");
const Meeting = require("../models/Meeting");
const User = require("../models/User");
const DailyReport = require("../models/DailyReport");
const Notification = require("../models/Notification");

exports.getOverviewStats = async (req, res) => {
  try {
    const managerId = new mongoose.Types.ObjectId(req.user._id);
    const companyId = new mongoose.Types.ObjectId(req.user.company);

    const projects = await Project.find({ manager: managerId, company: companyId });
    const projectIds = projects.map(p => p._id);

    const [totalTasks, completedTasks, overdueTasks, meetings] = await Promise.all([
      Task.countDocuments({ project: { $in: projectIds } }),
      Task.countDocuments({ project: { $in: projectIds }, status: { $in: ["done", "completed"] } }),
      Task.countDocuments({
        project: { $in: projectIds },
        status: { $nin: ["done", "completed"] },
        dueDate: { $lt: new Date() }
      }),
      Meeting.countDocuments({
        $or: [{ createdBy: managerId }, { participants: managerId }],
        companyId: companyId,
        startTime: { $gte: new Date() }
      })
    ]);

    return res.json({
      success: true,
      data: {
        assignedProjects: projects.length,
        totalTasks,
        completedTasks,
        overdueTasks,
        upcomingMeetings: meetings
      }
    });

  } catch (error) {
    console.error("Manager overview error:", error.message);
    return res.status(500).json({ success: false, message: error.message, errors: [] });
  }
};

exports.getTasks = async (req, res) => {
  try {
    const managerId = new mongoose.Types.ObjectId(req.user._id);
    const companyId = new mongoose.Types.ObjectId(req.user.company);

    const projects = await Project.find({ manager: managerId, company: companyId });
    const projectIds = projects.map(p => p._id);

    const tasks = await Task.find({ project: { $in: projectIds } })
      .populate("assignedTo", "fullName email")
      .populate("project", "name")
      .sort({ priority: 1, createdAt: -1 });

    return res.json({ success: true, data: tasks });
  } catch (error) {
    console.error("Manager get tasks error:", error.message);
    return res.status(500).json({ success: false, message: error.message, errors: [] });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const managerId = new mongoose.Types.ObjectId(req.user._id);

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found", errors: [] });

    const project = await Project.findOne({ _id: task.project, manager: managerId });
    if (!project) return res.status(403).json({ success: false, message: "Not authorized", errors: [] });

    const updated = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });

    // Emit event
    try {
      const { emitToCompany } = require('../socket');
      emitToCompany(updated.company.toString(), 'task:updated', { taskId: updated._id, status: updated.status });
    } catch (e) {
      console.error('Socket emit error:', e);
    }

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Manager update task error:", error.message);
    return res.status(500).json({ success: false, message: error.message, errors: [] });
  }
};

exports.getProjectsProgress = async (req, res) => {
  try {
    const managerId = new mongoose.Types.ObjectId(req.user._id);
    const companyId = new mongoose.Types.ObjectId(req.user.company);

    const projects = await Project.find({ manager: managerId, company: companyId });

    const result = await Promise.all(projects.map(async (p) => {
      const total = await Task.countDocuments({ project: p._id });
      const done = await Task.countDocuments({ project: p._id, status: { $in: ["done", "completed"] } });
      return {
        name: p.name,
        progress: total > 0 ? Math.round((done / total) * 100) : 0,
        status: p.status
      };
    }));

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("Manager projects progress error:", error.message);
    return res.status(500).json({ success: false, message: error.message, errors: [] });
  }
};

exports.getTasksStatusSummary = async (req, res) => {
  try {
    const managerId = new mongoose.Types.ObjectId(req.user._id);

    const projects = await Project.find({ manager: managerId });
    const projectIds = projects.map(p => p._id);

    const [todo, inProgress, done, overdue] = await Promise.all([
      Task.countDocuments({ project: { $in: projectIds }, status: "todo" }),
      Task.countDocuments({ project: { $in: projectIds }, status: "in_progress" }),
      Task.countDocuments({ project: { $in: projectIds }, status: { $in: ["done", "completed"] } }),
      Task.countDocuments({
        project: { $in: projectIds },
        status: { $nin: ["done", "completed"] },
        dueDate: { $lt: new Date() }
      })
    ]);

    return res.json({ success: true, data: { todo, inProgress, done, overdue } });
  } catch (error) {
    console.error("Manager task status summary error:", error.message);
    return res.status(500).json({ success: false, message: error.message, errors: [] });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const managerId = new mongoose.Types.ObjectId(req.user._id);
    const { status } = req.body;

    // Using require here because socket might not be fully initialized at start, but it works
    const { emitToCompany } = require('../socket');

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, manager: managerId },
      { status },
      { new: true }
    );

    if (!project) return res.status(404).json({ success: false, message: "Project not found or not authorized", errors: [] });

    // Emit event
    try {
      emitToCompany(project.company.toString(), 'project:updated', { projectId: project._id, status: project.status });
    } catch (e) {
      console.error('Socket emit error:', e);
    }

    return res.json({ success: true, data: project });
  } catch (error) {
    console.error("Manager update project error:", error.message);
    return res.status(500).json({ success: false, message: error.message, errors: [] });
  }
};

// --- NEW MANAGER ENDPOINTS ---

exports.getEmployees = async (req, res) => {
  try {
    const managerId = req.user._id;
    // For simplicity: Employees associated with the same company. 
    // In strict org it would be ones assigned to projects managed by this manager.
    // Let's get employees on projects this manager manages:
    const projects = await Project.find({ manager: managerId }).populate('team');
    // Get unique team members
    const teamSet = new Set();
    projects.forEach(p => p.team?.forEach(member => teamSet.add(member.toString())));

    const employees = await User.find({ _id: { $in: Array.from(teamSet) }, role: 'employee' });

    // Attach quick stats
    const results = await Promise.all(employees.map(async (emp) => {
      const taskDone = await Task.countDocuments({ assignedTo: emp._id, status: 'completed' });
      const taskTotal = await Task.countDocuments({ assignedTo: emp._id });
      return {
        ...emp.toObject(),
        taskDone,
        taskTotal,
        performanceScore: taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0
      };
    }));

    return res.json({ success: true, data: results });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, errors: [] });
  }
};

exports.getDailyReports = async (req, res) => {
  try {
    const reports = await DailyReport.find({ manager: req.user._id })
      .populate('employee', 'fullName avatar email')
      .populate('task', 'title')
      .sort({ createdAt: -1 });
    return res.json({ success: true, data: reports });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, errors: [] });
  }
};

exports.updateDailyReportStatus = async (req, res) => {
  try {
    const { status, managerComment } = req.body;
    const report = await DailyReport.findOneAndUpdate(
      { _id: req.params.id, manager: req.user._id },
      { status, managerComment },
      { new: true }
    );
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    if (status === 'approved') {
      await Task.findByIdAndUpdate(report.task, { status: 'completed' });
    } else if (status === 'needs_revision') {
      await Task.findByIdAndUpdate(report.task, { status: 'in_progress' });
    }

    // Ensure socket emit
    const { emitToUser } = require('../socket');
    try {
      emitToUser(report.employee.toString(), 'report:reviewed', { reportId: report._id, status });
      await Notification.create({
        company: req.user.company,
        user: report.employee,
        title: 'Report Reviewed',
        message: `Your manager reviewed your daily report: ${status.replace('_', ' ')}`,
        type: 'report',
      });
      emitToUser(report.employee.toString(), 'notification');
    } catch (e) { }

    return res.json({ success: true, data: report });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, errors: [] });
  }
};

exports.getMeetingRequests = async (req, res) => {
  try {
    // Basic setup: incoming meeting requests handled via notifications metadata
    const requests = await Notification.find({
      user: req.user._id,
      type: 'meeting_request',
      read: false
    }).sort({ createdAt: -1 });

    return res.json({ success: true, data: requests });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, errors: [] });
  }
};

exports.handleMeetingRequest = async (req, res) => {
  try {
    const { notificationId, action, reason, startTime, title } = req.body; // action: accept/decline
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: req.user._id },
      { read: true }
    );
    if (!notification) return res.status(404).json({ success: false, message: 'Request not found' });

    const requesterId = notification.metadata?.requesterId;
    if (!requesterId) return res.json({ success: true });

    if (action === 'accept') {
      const meeting = await Meeting.create({
        companyId: req.user.company,
        title: title || 'Scheduled Meeting',
        type: 'video', // or 'in-person'
        startTime: startTime || new Date(),
        durationMinutes: 30,
        createdBy: req.user._id,
        participants: [req.user._id, requesterId],
        status: 'scheduled'
      });

      await Notification.create({
        company: req.user.company,
        user: requesterId,
        title: 'Meeting Accepted',
        message: `Your meeting request was accepted and scheduled.`,
        type: 'meeting'
      });
    } else {
      await Notification.create({
        company: req.user.company,
        user: requesterId,
        title: 'Meeting Declined',
        message: `Your meeting request was declined. Reason: ${reason || 'N/A'}`,
        type: 'meeting'
      });
    }

    const { emitToUser } = require('../socket');
    try {
      emitToUser(requesterId, 'notification');
      if (action === 'accept') emitToUser(requesterId, 'meeting:scheduled');
    } catch (e) { }

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, errors: [] });
  }
};
