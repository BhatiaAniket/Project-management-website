const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Meeting = require('../models/Meeting');
const User = require('../models/User');
const DailyReport = require('../models/DailyReport');
const Notification = require('../models/Notification');
const ManagerRating = require('../models/ManagerRating');
const toObjectId = require('../utils/toObjectId');
const {
  calculateEmployeeScore,
  calculateManagerScore,
  getScoreLabel,
} = require('../services/performanceScore.service');
const {
  generateManagerAIReport,
  generateEmployeeAIReport,
} = require('../services/openai.service');

// Helper: update project progress after task changes
const updateProjectProgress = async (projectId, io) => {
  try {
    const total = await Task.countDocuments({ project: projectId });
    if (total === 0) return;
    const done = await Task.countDocuments({ project: projectId, status: { $in: ['done', 'completed'] } });
    const progress = Math.round((done / total) * 100);
    const updatedProject = await Project.findByIdAndUpdate(projectId, { progress }, { new: true });

    if (progress === 100 && updatedProject) {
      await Project.findByIdAndUpdate(projectId, { status: 'completed' });
      if (io) {
        io.to(`company:${updatedProject.company.toString()}`).emit('project:completed', {
          projectId,
          projectName: updatedProject.name,
        });
      }
    }
  } catch (e) {
    console.error('updateProjectProgress error:', e.message);
  }
};

// ── OVERVIEW STATS ──────────────────────────────────────────────────────────
exports.getOverviewStats = async (req, res) => {
  try {
    const managerId = toObjectId(req.user._id);
    const companyId = toObjectId(req.user.company);

    const projects = await Project.find({ manager: managerId, company: companyId });
    const projectIds = projects.map(p => p._id);

    const [totalTasks, completedTasks, overdueTasks, upcomingMeetings, totalEmployees] = await Promise.all([
      Task.countDocuments({ project: { $in: projectIds } }),
      Task.countDocuments({ project: { $in: projectIds }, status: { $in: ['done', 'completed'] } }),
      Task.countDocuments({
        project: { $in: projectIds },
        status: { $nin: ['done', 'completed'] },
        dueDate: { $lt: new Date() },
      }),
      Meeting.countDocuments({
        $or: [{ createdBy: managerId }, { participants: managerId }],
        companyId,
        startTime: { $gte: new Date() },
        status: { $ne: 'cancelled' },
      }),
      User.countDocuments({ company: companyId, role: 'employee', isActive: { $ne: false } }),
    ]);

    return res.json({
      success: true,
      data: {
        assignedProjects: projects.length,
        activeProjects: projects.filter(p => p.status === 'in_progress').length,
        totalTasks,
        completedTasks,
        overdueTasks,
        upcomingMeetings,
        totalEmployees,
      },
    });
  } catch (error) {
    console.error('Manager overview error:', error.message);
    return res.status(500).json({ success: false, message: error.message, errors: [] });
  }
};

// ── PROJECT PROGRESS CHART ───────────────────────────────────────────────────
exports.getProjectsProgress = async (req, res) => {
  try {
    const managerId = toObjectId(req.user._id);
    const companyId = toObjectId(req.user.company);

    const projects = await Project.find({ manager: managerId, company: companyId });

    const result = await Promise.all(
      projects.map(async p => {
        const total = await Task.countDocuments({ project: p._id });
        const done = await Task.countDocuments({ project: p._id, status: { $in: ['done', 'completed'] } });
        return {
          name: p.name,
          progress: total > 0 ? Math.round((done / total) * 100) : 0,
          status: p.status,
        };
      })
    );

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Manager projects progress error:', error.message);
    return res.status(500).json({ success: false, message: error.message, errors: [] });
  }
};

// ── TASK STATUS DONUT CHART ──────────────────────────────────────────────────
exports.getTasksStatusSummary = async (req, res) => {
  try {
    const managerId = toObjectId(req.user._id);
    const companyId = toObjectId(req.user.company);

    const projects = await Project.find({ manager: managerId, company: companyId });
    const projectIds = projects.map(p => p._id);

    const [todo, inProgress, done, overdue] = await Promise.all([
      Task.countDocuments({ project: { $in: projectIds }, status: 'todo' }),
      Task.countDocuments({ project: { $in: projectIds }, status: 'in_progress' }),
      Task.countDocuments({ project: { $in: projectIds }, status: { $in: ['done', 'completed'] } }),
      Task.countDocuments({
        project: { $in: projectIds },
        status: { $nin: ['done', 'completed'] },
        dueDate: { $lt: new Date() },
      }),
    ]);

    return res.json({ success: true, data: { todo, inProgress, done, overdue } });
  } catch (error) {
    console.error('Manager task status summary error:', error.message);
    return res.status(500).json({ success: false, message: error.message, errors: [] });
  }
};

// ── RECENT ACTIVITY ──────────────────────────────────────────────────────────
exports.getRecentActivity = async (req, res) => {
  try {
    const managerId = toObjectId(req.user._id);
    const companyId = toObjectId(req.user.company);

    const projects = await Project.find({ manager: managerId, company: companyId });
    const projectIds = projects.map(p => p._id);

    const tasks = await Task.find({ project: { $in: projectIds } })
      .sort({ updatedAt: -1 })
      .limit(15)
      .populate('assignedTo', 'fullName');

    const activity = tasks.map(t => ({
      type: 'task',
      message: `${t.assignedTo?.fullName || 'Someone'} updated "${t.title}" → ${t.status}`,
      timestamp: t.updatedAt,
      color: t.status === 'completed' ? 'green' : t.status === 'in_progress' ? 'blue' : 'yellow',
    }));

    return res.json({ success: true, data: activity });
  } catch (error) {
    console.error('Manager recent activity error:', error.message);
    return res.status(500).json({ success: false, message: error.message, errors: [] });
  }
};

// ── GET ALL TASKS ────────────────────────────────────────────────────────────
exports.getTasks = async (req, res) => {
  try {
    const managerId = toObjectId(req.user._id);
    const companyId = toObjectId(req.user.company);
    const { projectId } = req.query;

    const projectQuery = { manager: managerId, company: companyId };
    if (projectId) projectQuery._id = toObjectId(projectId);

    const projects = await Project.find(projectQuery);
    const projectIds = projects.map(p => p._id);

    const tasks = await Task.find({ project: { $in: projectIds }, company: companyId })
      .populate('assignedTo', 'fullName email avatar')
      .populate('project', 'name')
      .sort({ priority: 1, createdAt: -1 });

    return res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('Manager get tasks error:', error.message);
    return res.status(500).json({ success: false, message: error.message, errors: [] });
  }
};

// ── GET UNASSIGNED TASKS ─────────────────────────────────────────────────────
exports.getUnassignedTasks = async (req, res) => {
  try {
    const managerId = toObjectId(req.user._id);
    const companyId = toObjectId(req.user.company);

    const projects = await Project.find({ manager: managerId, company: companyId });
    const projectIds = projects.map(p => p._id);

    const unassigned = await Task.find({
      project: { $in: projectIds },
      $or: [{ assignedTo: null }, { assignedTo: { $exists: false } }],
    })
      .populate('project', 'name')
      .sort({ priority: 1, createdAt: -1 });

    return res.json({ success: true, data: unassigned });
  } catch (error) {
    console.error('Manager get unassigned tasks error:', error.message);
    return res.status(500).json({ success: false, message: error.message, errors: [] });
  }
};

// ── ASSIGN TASK TO EMPLOYEE ──────────────────────────────────────────────────
exports.assignTask = async (req, res) => {
  try {
    const managerId = toObjectId(req.user._id);
    const companyId = toObjectId(req.user.company);
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'employeeId is required', errors: [] });
    }

    // Find task and verify it belongs to this manager's project
    const task = await Task.findById(req.params.id).populate('project');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found', errors: [] });

    if (task.project.manager.toString() !== managerId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized', errors: [] });
    }

    // Verify employee belongs to same company
    const employee = await User.findOne({
      _id: toObjectId(employeeId),
      company: companyId,
      role: 'employee',
    });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found in your company', errors: [] });
    }

    // Track reassignment count
    const isReassignment =
      task.assignedTo && task.assignedTo.toString() !== employeeId.toString();

    const updated = await Task.findByIdAndUpdate(
      req.params.id,
      {
        assignedTo: toObjectId(employeeId),
        assignedManager: managerId,
        $inc: { reassignmentCount: isReassignment ? 1 : 0 },
      },
      { new: true }
    )
      .populate('assignedTo', 'fullName email avatar')
      .populate('project', 'name');

    // Notify employee
    try {
      const { emitToUser, emitToCompany } = require('../socket');
      emitToUser(employeeId.toString(), 'task:assigned', {
        task: updated,
        message: `Task assigned to you: ${task.title}`,
      });
      emitToCompany(companyId.toString(), 'task:updated', {
        taskId: updated._id,
        status: updated.status,
      });

      await Notification.create({
        company: companyId,
        user: toObjectId(employeeId),
        title: 'New Task Assigned',
        message: `New task assigned to you: ${task.title}`,
        type: 'task_assigned',
        relatedId: task._id,
        relatedModel: 'Task',
      });
    } catch (e) {
      console.error('Socket/notification error:', e.message);
    }

    // Recalculate manager score (unassigned tasks affect process quality)
    try {
      const { score } = await calculateManagerScore(managerId, companyId);
      await User.findByIdAndUpdate(managerId, { performanceScore: score });

      const { emitToUser } = require('../socket');
      emitToUser(managerId.toString(), 'score:updated', {
        userId: managerId.toString(),
        newScore: score,
      });
    } catch (e) {
      console.error('Score recalc error:', e.message);
    }

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Manager assign task error:', error.message);
    return res.status(500).json({ success: false, message: error.message, errors: [] });
  }
};

// ── CREATE TASK ──────────────────────────────────────────────────────────────
exports.createTask = async (req, res) => {
  try {
    const managerId = toObjectId(req.user._id);
    const companyId = toObjectId(req.user.company);
    const { title, description, assignedTo, projectId, priority, dueDate } = req.body;

    if (!title || !projectId) {
      return res.status(400).json({ success: false, message: 'Title and projectId are required', errors: [] });
    }

    // Verify project belongs to this manager
    const project = await Project.findOne({
      _id: toObjectId(projectId),
      manager: managerId,
      company: companyId,
    });
    if (!project) {
      return res.status(403).json({ success: false, message: 'Project not found or not assigned to you', errors: [] });
    }

    // Verify employee belongs to same company
    let employee = null;
    if (assignedTo) {
      employee = await User.findOne({ _id: toObjectId(assignedTo), company: companyId, role: 'employee' });
      if (!employee) {
        return res.status(404).json({ success: false, message: 'Employee not found in your company', errors: [] });
      }
    }

    const task = await Task.create({
      title,
      description: description || '',
      assignedTo: assignedTo ? toObjectId(assignedTo) : null,
      assignedManager: managerId,
      project: toObjectId(projectId),
      company: companyId,
      priority: priority || 'medium',
      dueDate: dueDate ? new Date(dueDate) : null,
      status: 'todo',
      reassignmentCount: 0,
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'fullName email avatar')
      .populate('project', 'name');

    // Notify employee via socket + DB notification
    if (assignedTo && employee) {
      try {
        const { emitToUser, emitToCompany } = require('../socket');
        emitToUser(assignedTo.toString(), 'task:assigned', {
          task: populatedTask,
          message: `New task assigned: ${title}`,
        });
        await Notification.create({
          company: companyId,
          user: toObjectId(assignedTo),
          title: 'New Task Assigned',
          message: `New task assigned to you: ${title}`,
          type: 'task_assigned',
          relatedId: task._id,
          relatedModel: 'Task',
        });
        emitToCompany(companyId.toString(), 'activity:new', {
          type: 'task_created',
          message: `Manager created task: ${title}`,
          timestamp: new Date(),
        });
      } catch (e) {
        console.error('Socket/notification error:', e.message);
      }
    }

    // Update project status to in_progress if it was not_started
    if (project.status === 'not_started') {
      await Project.findByIdAndUpdate(projectId, { status: 'in_progress' });
    }

    return res.status(201).json({ success: true, data: populatedTask });
  } catch (error) {
    console.error('Manager create task error:', error.message);
    return res.status(500).json({ success: false, message: error.message, errors: [] });
  }
};

// ── UPDATE TASK (drag-drop / status) ────────────────────────────────────────
exports.updateTask = async (req, res) => {
  try {
    const managerId = toObjectId(req.user._id);

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found', errors: [] });

    const project = await Project.findOne({ _id: task.project, manager: managerId });
    if (!project) return res.status(403).json({ success: false, message: 'Not authorized', errors: [] });

    // If status is being set to completed, stamp completedAt
    const updateBody = { ...req.body };
    if (updateBody.status === 'completed' && !updateBody.completedAt) {
      updateBody.completedAt = new Date();
    }

    const updated = await Task.findByIdAndUpdate(req.params.id, updateBody, { new: true })
      .populate('assignedTo', 'fullName email avatar')
      .populate('project', 'name');

    try {
      const { emitToCompany } = require('../socket');
      emitToCompany(project.company.toString(), 'task:updated', {
        taskId: updated._id,
        status: updated.status,
      });
    } catch (e) {
      console.error('Socket emit error:', e.message);
    }

    // Recalculate score if task was completed/status changed
    if (updateBody.status && updated.assignedTo) {
      try {
        const { score } = await calculateEmployeeScore(updated.assignedTo._id, project.company);
        await User.findByIdAndUpdate(updated.assignedTo._id, { performanceScore: score });
        const { emitToUser } = require('../socket');
        emitToUser(updated.assignedTo._id.toString(), 'score:updated', {
          userId: updated.assignedTo._id.toString(),
          newScore: score,
        });
      } catch (e) {
        console.error('Score recalc error:', e.message);
      }
    }

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Manager update task error:', error.message);
    return res.status(500).json({ success: false, message: error.message, errors: [] });
  }
};

// ── REVIEW TASK (approve / reject under_review) ──────────────────────────────
exports.reviewTask = async (req, res) => {
  try {
    const managerId = toObjectId(req.user._id);
    const companyId = toObjectId(req.user.company);
    const { status, feedback } = req.body;

    const task = await Task.findById(req.params.id).populate('project');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found', errors: [] });

    if (task.project.manager.toString() !== managerId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized', errors: [] });
    }

    const updateData = { status };
    if (status === 'completed') updateData.completedAt = new Date();

    const updated = await Task.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .populate('assignedTo', 'fullName email')
      .populate('project', 'name');

    // Notify employee of review result
    if (task.assignedTo) {
      try {
        const { emitToUser } = require('../socket');
        emitToUser(task.assignedTo.toString(), 'task:reviewed', {
          taskId: task._id,
          taskTitle: task.title,
          status,
          feedback: feedback || '',
          reviewedBy: req.user.fullName,
        });
        await Notification.create({
          company: companyId,
          user: task.assignedTo,
          title: 'Task Reviewed',
          message:
            status === 'completed'
              ? `Your task "${task.title}" was approved ✅`
              : `Your task "${task.title}" needs more work 🔄`,
          type: 'task_updated',
          relatedId: task._id,
          relatedModel: 'Task',
        });
      } catch (e) {
        console.error('Socket/notification error:', e.message);
      }
    }

    // Recalculate employee score
    if (task.assignedTo) {
      try {
        const { score } = await calculateEmployeeScore(task.assignedTo, companyId);
        await User.findByIdAndUpdate(task.assignedTo, { performanceScore: score });
        const { emitToUser } = require('../socket');
        emitToUser(task.assignedTo.toString(), 'score:updated', {
          userId: task.assignedTo.toString(),
          newScore: score,
        });
      } catch (e) {
        console.error('Score recalc error:', e.message);
      }
    }

    // Update project progress
    try {
      const { getIO } = require('../socket');
      await updateProjectProgress(task.project._id, getIO());
    } catch (e) {
      console.error('updateProjectProgress error:', e.message);
    }

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Manager review task error:', error.message);
    return res.status(500).json({ success: false, message: error.message, errors: [] });
  }
};

// ── UPDATE PROJECT ───────────────────────────────────────────────────────────
exports.updateProject = async (req, res) => {
  try {
    const managerId = toObjectId(req.user._id);
    const { status } = req.body;

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, manager: managerId },
      { status },
      { new: true }
    );
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found or not authorized', errors: [] });
    }

    try {
      const { emitToCompany } = require('../socket');
      emitToCompany(project.company.toString(), 'project:updated', {
        projectId: project._id,
        status: project.status,
      });
    } catch (e) {
      console.error('Socket emit error:', e.message);
    }

    return res.json({ success: true, data: project });
  } catch (error) {
    console.error('Manager update project error:', error.message);
    return res.status(500).json({ success: false, message: error.message, errors: [] });
  }
};

// ── GET ALL COMPANY EMPLOYEES (live stats) ────────────────────────────────────
exports.getEmployees = async (req, res) => {
  try {
    const managerId = toObjectId(req.user._id);
    const companyId = toObjectId(req.user.company);

    const employees = await User.find({
      company: companyId,
      role: 'employee',
      isActive: { $ne: false },
    }).select('fullName email position department avatar lastActive');

    const employeesWithStats = await Promise.all(
      employees.map(async emp => {
        const empId = toObjectId(emp._id);

        const [total, done, inProgress, overdue] = await Promise.all([
          Task.countDocuments({ assignedTo: empId, company: companyId }),
          Task.countDocuments({ assignedTo: empId, company: companyId, status: { $in: ['done', 'completed'] } }),
          Task.countDocuments({ assignedTo: empId, company: companyId, status: 'in_progress' }),
          Task.countDocuments({
            assignedTo: empId,
            company: companyId,
            status: { $nin: ['done', 'completed'] },
            dueDate: { $lt: new Date() },
          }),
        ]);

        const { score } = await calculateEmployeeScore(empId, companyId);

        // Latest rating given by this manager to this employee
        const latestRating = await ManagerRating.findOne({
          managerId,
          employeeId: empId,
        }).sort({ createdAt: -1 });

        return {
          _id: emp._id,
          fullName: emp.fullName,
          email: emp.email,
          position: emp.position,
          department: emp.department,
          avatar: emp.avatar,
          lastActive: emp.lastActive,
          isActive: emp.isActive !== false,
          totalTasks: total,
          completedTasks: done,
          inProgressTasks: inProgress,
          overdueTasks: overdue,
          score,
          latestRating: latestRating?.rating || null,
          scoreLabel: getScoreLabel(score),
        };
      })
    );

    return res.json({ success: true, data: employeesWithStats });
  } catch (error) {
    console.error('Manager get employees error:', error.message);
    return res.status(500).json({ success: false, message: error.message, errors: [] });
  }
};

// ── RATE EMPLOYEE ─────────────────────────────────────────────────────────────
exports.rateEmployee = async (req, res) => {
  try {
    const managerId = toObjectId(req.user._id);
    const companyId = toObjectId(req.user.company);
    const { employeeId, taskId, rating, comment, category } = req.body;

    // Support both /employees/:id/rate (old) and /rate-employee (new)
    const empId = toObjectId(employeeId || req.params.id);

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5', errors: [] });
    }

    const employee = await User.findOne({ _id: empId, company: companyId, role: 'employee' });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found', errors: [] });
    }

    let ratingDoc;
    if (taskId) {
      // Upsert: one rating per manager per task
      const existing = await ManagerRating.findOne({
        managerId,
        employeeId: empId,
        taskId: toObjectId(taskId),
        company: companyId,
      });

      if (existing) {
        ratingDoc = await ManagerRating.findByIdAndUpdate(
          existing._id,
          { rating, comment: comment || '', category: category || 'overall' },
          { new: true }
        );
      } else {
        ratingDoc = await ManagerRating.create({
          managerId,
          employeeId: empId,
          taskId: toObjectId(taskId),
          company: companyId,
          rating,
          comment: comment || '',
          category: category || 'overall',
        });
      }
    } else {
      // Legacy: no taskId — store rating in metadata
      await User.findByIdAndUpdate(empId, {
        $set: { 'metadata.managerRating': rating },
      });
    }

    // Recalculate employee score
    const { score } = await calculateEmployeeScore(empId, companyId);
    await User.findByIdAndUpdate(empId, { performanceScore: score });

    // Notify employee
    try {
      const { emitToUser } = require('../socket');
      const taskDoc = taskId ? await Task.findById(taskId).select('title') : null;
      emitToUser(empId.toString(), 'rating:received', {
        rating,
        comment: comment || '',
        taskTitle: taskDoc?.title || '',
        ratedBy: req.user.fullName,
      });
      emitToUser(empId.toString(), 'score:updated', {
        userId: empId.toString(),
        newScore: score,
      });
    } catch (e) {
      console.error('Socket error:', e.message);
    }

    return res.json({ success: true, message: 'Rating updated successfully', rating: ratingDoc, newScore: score });
  } catch (error) {
    console.error('Rate employee error:', error.message);
    return res.status(500).json({ success: false, message: error.message, errors: [] });
  }
};

// ── TEAM PERFORMANCE (all employees with scores) ──────────────────────────────
exports.getPerformanceTeam = async (req, res) => {
  try {
    const companyId = toObjectId(req.user.company);

    const employees = await User.find({
      company: companyId,
      role: 'employee',
      isActive: { $ne: false },
    }).select('fullName email position department avatar lastActive');

    const performanceData = await Promise.all(
      employees.map(async emp => {
        const { score, breakdown } = await calculateEmployeeScore(emp._id, companyId);

        return {
          _id: emp._id,
          fullName: emp.fullName,
          email: emp.email,
          role: 'employee',
          position: emp.position,
          department: emp.department,
          avatar: emp.avatar,
          lastActive: emp.lastActive,
          score,
          breakdown,
          scoreLabel: getScoreLabel(score),
          // Legacy fields for backward compat
          tasksAssigned: breakdown.total,
          tasksCompleted: breakdown.completedOnTime + breakdown.completedLate,
          tasksOverdue: breakdown.overdue,
          productivityScore: Math.round(score / 10), // 0-100 version
        };
      })
    );

    performanceData.sort((a, b) => b.score - a.score);

    return res.json({
      success: true,
      data: { performance: performanceData, total: performanceData.length },
    });
  } catch (error) {
    console.error('Manager team performance error:', error.message);
    return res.status(500).json({ success: false, message: error.message, errors: [] });
  }
};

// ── SINGLE EMPLOYEE PERFORMANCE DETAIL ────────────────────────────────────────
exports.getEmployeePerformanceDetail = async (req, res) => {
  try {
    const managerId = toObjectId(req.user._id);
    const companyId = toObjectId(req.user.company);
    const empId = toObjectId(req.params.id);

    const employee = await User.findOne({ _id: empId, company: companyId })
      .select('fullName email position department avatar lastActive');
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found', errors: [] });
    }

    const { score, breakdown } = await calculateEmployeeScore(empId, companyId);

    // All tasks for this employee
    const tasks = await Task.find({ assignedTo: empId, company: companyId })
      .populate('project', 'name')
      .sort({ createdAt: -1 });

    // Ratings given by this manager to this employee
    const ratings = await ManagerRating.find({ managerId, employeeId: empId })
      .populate('taskId', 'title')
      .sort({ createdAt: -1 });

    // Weekly chart — tasks completed per day (last 7 days)
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const start = new Date(d.setHours(0, 0, 0, 0));
      const end = new Date(new Date(start).setHours(23, 59, 59, 999));
      const completed = await Task.countDocuments({
        assignedTo: empId,
        status: 'completed',
        completedAt: { $gte: start, $lte: end },
      });
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      weeklyData.push({ day: days[start.getDay()], completed, date: start });
    }

    return res.json({
      success: true,
      data: {
        employee,
        score,
        breakdown,
        scoreLabel: getScoreLabel(score),
        tasks,
        ratings,
        weeklyData,
      },
    });
  } catch (error) {
    console.error('Employee performance detail error:', error.message);
    return res.status(500).json({ success: false, message: error.message, errors: [] });
  }
};

// ── MY (MANAGER) PERFORMANCE ─────────────────────────────────────────────────
exports.getPerformanceMe = async (req, res) => {
  try {
    const managerId = toObjectId(req.user._id);
    const companyId = toObjectId(req.user.company);

    const { score, breakdown } = await calculateManagerScore(managerId, companyId);

    const projects = await Project.find({ manager: managerId, company: companyId });
    const projectIds = projects.map(p => p._id);

    // Weekly team output chart (last 7 days)
    const weeklyTeamData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const start = new Date(d.setHours(0, 0, 0, 0));
      const end = new Date(new Date(start).setHours(23, 59, 59, 999));
      const completed = await Task.countDocuments({
        project: { $in: projectIds },
        status: 'completed',
        completedAt: { $gte: start, $lte: end },
      });
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      weeklyTeamData.push({ day: days[start.getDay()], completed });
    }

    // Score breakdown for radar/bar chart
    const scoreBreakdownChart = [
      { label: 'Team Output', value: breakdown.teamScore, max: 500 },
      { label: 'Process Quality', value: breakdown.processScore, max: 300 },
      { label: 'Own Tasks', value: breakdown.ownScore, max: 200 },
    ];

    return res.json({
      success: true,
      data: {
        score,
        breakdown,
        scoreLabel: getScoreLabel(score),
        weeklyTeamData,
        scoreBreakdownChart,
        projects: projects.map(p => ({
          name: p.name,
          status: p.status,
          progress: p.progress || 0,
        })),
        // Legacy fields for backward compat
        stats: {
          totalProjects: projects.length,
          activeProjects: projects.filter(p => p.status === 'in_progress').length,
          teamTotal: breakdown.teamTotal,
          teamDone: breakdown.teamDone,
          teamOverdue: breakdown.teamOverdue,
        },
        person: {
          fullName: req.user.fullName,
          email: req.user.email,
          role: req.user.role,
        },
      },
    });
  } catch (error) {
    console.error('Manager own performance error:', error.message);
    return res.status(500).json({ success: false, message: error.message, errors: [] });
  }
};

// ── MANAGER AI PERFORMANCE REPORT ─────────────────────────────────────────────
exports.getManagerAIReport = async (req, res) => {
  try {
    const managerId = toObjectId(req.user._id);
    const companyId = toObjectId(req.user.company);

    const manager = await User.findById(managerId).select(
      'fullName lastAIReport lastAIReportAt'
    );

    // Rate limit: once per day
    const today = new Date().toDateString();
    if (manager.lastAIReportAt && manager.lastAIReportAt.toDateString() === today) {
      return res.json({
        success: true,
        data: {
          cached: true,
          report: manager.lastAIReport,
          generatedAt: manager.lastAIReportAt,
        },
      });
    }

    const { score, breakdown } = await calculateManagerScore(managerId, companyId);

    const report = await generateManagerAIReport({
      name: manager.fullName,
      score,
      breakdown,
    });

    // Cache the report
    await User.findByIdAndUpdate(managerId, {
      lastAIReport: report,
      lastAIReportAt: new Date(),
    });

    return res.json({
      success: true,
      data: { cached: false, report, score, breakdown, generatedAt: new Date() },
    });
  } catch (error) {
    console.error('Manager AI report error:', error.message);
    return res.status(500).json({ success: false, message: error.message, errors: [] });
  }
};

// ── DAILY REPORTS ─────────────────────────────────────────────────────────────
exports.getDailyReports = async (req, res) => {
  try {
    const managerId = toObjectId(req.user._id);
    const companyId = toObjectId(req.user.company);

    const reports = await DailyReport.find({ manager: managerId, company: companyId })
      .populate('employee', 'fullName avatar email position')
      .populate('task', 'title priority status')
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: reports });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, errors: [] });
  }
};

// ── REVIEW DAILY REPORT ──────────────────────────────────────────────────────
exports.updateDailyReportStatus = async (req, res) => {
  try {
    const managerId = toObjectId(req.user._id);
    const companyId = toObjectId(req.user.company);
    const { status, managerComment } = req.body;

    const report = await DailyReport.findOneAndUpdate(
      { _id: req.params.id, manager: managerId },
      { status, managerComment: managerComment || '' },
      { new: true }
    )
      .populate('employee', 'fullName email')
      .populate('task', 'title');

    if (!report) return res.status(404).json({ success: false, message: 'Report not found', errors: [] });

    // Update task status based on review decision
    if (report.task) {
      const taskId = report.task._id || report.task;
      if (status === 'approved') {
        await Task.findByIdAndUpdate(taskId, { status: 'completed', completedAt: new Date() });
      } else if (status === 'needs_revision') {
        await Task.findByIdAndUpdate(taskId, { status: 'in_progress' });
      }
    }

    // Notify employee
    if (report.employee) {
      try {
        const { emitToUser } = require('../socket');
        const empId = report.employee._id || report.employee;
        emitToUser(empId.toString(), 'report:reviewed', {
          reportId: report._id,
          status,
          feedback: managerComment,
        });
        await Notification.create({
          company: companyId,
          user: empId,
          title: 'Report Reviewed',
          message: `Your manager reviewed your daily report: ${status.replace('_', ' ')}`,
          type: 'task_updated',
        });
        emitToUser(empId.toString(), 'notification');

        // Recalculate employee score after review
        if (status === 'approved') {
          const { score } = await calculateEmployeeScore(empId, companyId);
          await User.findByIdAndUpdate(empId, { performanceScore: score });
          emitToUser(empId.toString(), 'score:updated', {
            userId: empId.toString(),
            newScore: score,
          });
        }
      } catch (e) {
        console.error('Socket/notification error:', e.message);
      }
    }

    return res.json({ success: true, data: report });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, errors: [] });
  }
};

// ── MEETING REQUESTS ─────────────────────────────────────────────────────────
exports.getMeetingRequests = async (req, res) => {
  try {
    const requests = await Notification.find({
      user: req.user._id,
      isRead: false,
    })
      .sort({ createdAt: -1 })
      .limit(20);

    return res.json({ success: true, data: requests });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, errors: [] });
  }
};

// ── HANDLE MEETING REQUEST ───────────────────────────────────────────────────
exports.handleMeetingRequest = async (req, res) => {
  try {
    const { notificationId, action, reason, startTime, title } = req.body;
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: req.user._id },
      { isRead: true }
    );
    if (!notification) return res.status(404).json({ success: false, message: 'Request not found', errors: [] });

    const requesterId = notification.relatedId;
    if (!requesterId) return res.json({ success: true });

    const Meeting = require('../models/Meeting');
    if (action === 'accept') {
      await Meeting.create({
        companyId: req.user.company,
        title: title || 'Scheduled Meeting',
        type: 'one-on-one',
        startTime: startTime || new Date(),
        durationMinutes: 30,
        createdBy: req.user._id,
        participants: [req.user._id, requesterId],
        status: 'scheduled',
      });
      await Notification.create({
        company: req.user.company,
        user: requesterId,
        title: 'Meeting Accepted',
        message: 'Your meeting request was accepted and scheduled.',
        type: 'general',
      });
    } else {
      await Notification.create({
        company: req.user.company,
        user: requesterId,
        title: 'Meeting Declined',
        message: `Your meeting request was declined. Reason: ${reason || 'N/A'}`,
        type: 'general',
      });
    }

    try {
      const { emitToUser } = require('../socket');
      emitToUser(requesterId.toString(), 'notification');
      if (action === 'accept') emitToUser(requesterId.toString(), 'meeting:scheduled');
    } catch (e) {
      console.error('Socket emit error:', e.message);
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, errors: [] });
  }
};
