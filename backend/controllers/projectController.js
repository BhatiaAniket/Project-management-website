const { validationResult } = require('express-validator');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Company = require('../models/Company');
const ActivityLog = require('../models/ActivityLog');

// ━━━ LIST PROJECTS ━━━
exports.listProjects = async (req, res) => {
  try {
    const { status, priority, search, page = 1, limit = 20 } = req.query;
    const query = { company: req.companyId };
    if (req.user.role === 'manager') query.manager = req.user._id;

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (search) query.name = { $regex: search, $options: 'i' };

    const projects = await Project.find(query)
      .populate('manager', 'fullName avatar email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Project.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: { projects, total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ━━━ CREATE PROJECT ━━━
exports.createProject = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { name, description, manager, startDate, deadline, priority, status } = req.body;

    const project = await Project.create({
      name,
      description: description || '',
      company: req.companyId,
      manager: manager || null,
      startDate: startDate || Date.now(),
      deadline,
      priority: priority || 'medium',
      status: status || 'not_started',
    });

    // Update onboarding
    const company = await Company.findById(req.companyId);
    if (company && !company.onboarding.firstProjectCreated) {
      company.onboarding.firstProjectCreated = true;
      await company.save();
    }

    await ActivityLog.create({
      company: req.companyId,
      user: req.user._id,
      action: `Created project "${name}"`,
      entity: 'project',
      entityId: project._id,
    });

    return res.status(201).json({ success: true, data: project });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ━━━ GET PROJECT DETAIL ━━━
exports.getProject = async (req, res) => {
  try {
    const query = { _id: req.params.id, company: req.companyId };
    if (req.user.role === 'manager') query.manager = req.user._id;

    const project = await Project.findOne(query)
      .populate('manager', 'fullName avatar email')
      .populate('team', 'fullName avatar email role');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found', errors: [] });
    }

    const tasks = await Task.find({ project: project._id })
      .populate('assignedTo', 'fullName avatar')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: { project, tasks } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ━━━ UPDATE PROJECT ━━━
exports.updateProject = async (req, res) => {
  try {
    const query = { _id: req.params.id, company: req.companyId };
    if (req.user.role === 'manager') query.manager = req.user._id;

    const project = await Project.findOneAndUpdate(
      query,
      req.body,
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found', errors: [] });
    }

    try {
      const { emitToCompany } = require('../socket');
      emitToCompany(req.companyId, 'project:updated', { projectId: project._id, status: project.status });
    } catch (e) { }

    return res.status(200).json({ success: true, data: project });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ━━━ DELETE PROJECT ━━━
exports.deleteProject = async (req, res) => {
  try {
    const query = { _id: req.params.id, company: req.companyId };
    if (req.user.role === 'manager') query.manager = req.user._id;

    const project = await Project.findOneAndDelete(query);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found', errors: [] });
    }

    // Delete associated tasks
    await Task.deleteMany({ project: project._id });

    await ActivityLog.create({
      company: req.companyId,
      user: req.user._id,
      action: `Deleted project "${project.name}"`,
      entity: 'project',
      entityId: project._id,
    });

    return res.status(200).json({ success: true, message: 'Project deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ━━━ LIST ALL TASKS ━━━
exports.listAllTasks = async (req, res) => {
  try {
    const { status, priority } = req.query;
    
    // First figure out the projects the user is allowed to see
    const projectQuery = { company: req.companyId };
    if (req.user.role === 'manager') projectQuery.manager = req.user._id;
    
    const projects = await Project.find(projectQuery).select('_id');
    const projectIds = projects.map(p => p._id);

    // Now query tasks for these projects
    const taskQuery = { company: req.companyId, project: { $in: projectIds } };
    if (status) taskQuery.status = status;
    if (priority) taskQuery.priority = priority;

    const tasks = await Task.find(taskQuery)
      .populate({ path: 'project', select: 'name manager details' })
      .populate('assignedTo', 'fullName avatar email role')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: { tasks } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ━━━ ADD TASK TO PROJECT ━━━
exports.addTask = async (req, res) => {
  try {
    const { title, description, assignedTo, priority, dueDate } = req.body;

    const query = { _id: req.params.id, company: req.companyId };
    if (req.user.role === 'manager') query.manager = req.user._id;

    const project = await Project.findOne(query);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found', errors: [] });
    }

    // resolving assignedManager: if a manager is creating the task, that's the manager
    // else the project.manager is the manager
    const assignedManager = req.user.role === 'manager'
      ? req.user._id
      : (project.manager || null);

    const task = await Task.create({
      title,
      description: description || '',
      project: project._id,
      company: req.companyId,
      assignedTo: assignedTo || null,
      assignedManager,
      priority: priority || 'medium',
      dueDate: dueDate || null,
      status: 'todo',
    });

    // Notify assigned employee via socket
    if (assignedTo) {
      try {
        const { emitToUser } = require('../socket');
        const Notification = require('../models/Notification');
        emitToUser(assignedTo.toString(), 'task:assigned', {
          task: { _id: task._id, title, priority },
          message: `New task assigned: ${title}`,
        });
        await Notification.create({
          company: req.companyId,
          user: assignedTo,
          title: 'New Task Assigned',
          message: `New task assigned to you: ${title}`,
          type: 'task_assigned',
          relatedId: task._id,
          relatedModel: 'Task',
        });
      } catch (e) {
        console.error('Socket/notification error:', e.message);
      }
    }

    // Update project status to in_progress if not_started
    if (project.status === 'not_started') {
      await Project.findByIdAndUpdate(project._id, { status: 'in_progress' });
    }

    try {
      if (typeof project.calculateProgress === 'function') {
        await project.calculateProgress();
      }
    } catch (e) { }

    return res.status(201).json({ success: true, data: task });
  } catch (error) {
    console.error('addTask error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};


// ━━━ UPDATE TASK ━━━
exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.taskId, company: req.companyId });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found', errors: [] });
    }

    const project = await Project.findById(task.project);
    if (req.user.role === 'manager' && project.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized', errors: [] });
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.taskId,
      req.body,
      { new: true, runValidators: true }
    );

    if (project) await project.calculateProgress();

    try {
      const { emitToCompany } = require('../socket');
      emitToCompany(req.companyId, 'task:updated', { taskId: updatedTask._id, status: updatedTask.status });
      // If project progress changed, emit that too
      if (project) emitToCompany(req.companyId, 'project:updated', { projectId: project._id, status: project.status });
    } catch (e) { }

    return res.status(200).json({ success: true, data: updatedTask });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ━━━ ASSIGN MANAGER TO PROJECT ━━━
exports.assignManager = async (req, res) => {
  try {
    const { managerId } = req.body;
    const User = require('../models/User');

    if (!managerId) {
      return res.status(400).json({ success: false, message: 'managerId is required', errors: [] });
    }

    // Verify manager belongs to this company
    const manager = await User.findOne({ _id: managerId, company: req.companyId, role: 'manager' });
    if (!manager) {
      return res.status(404).json({ success: false, message: 'Manager not found in this company', errors: [] });
    }

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId },
      { manager: managerId, status: 'in_progress' },
      { new: true }
    ).populate('manager', 'fullName email');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found', errors: [] });
    }

    // Notify manager via Socket.io
    try {
      const { emitToUser } = require('../socket');
      const Notification = require('../models/Notification');

      emitToUser(managerId.toString(), 'project:assigned', {
        projectId: project._id,
        projectName: project.name,
        message: `You have been assigned project: ${project.name}`,
      });

      await Notification.create({
        company: req.companyId,
        user: managerId,
        title: 'Project Assigned',
        message: `New project assigned to you: ${project.name}`,
        type: 'general',
        relatedId: project._id,
        relatedModel: 'Project',
      });
      emitToUser(managerId.toString(), 'notification');
    } catch (e) {
      console.error('Socket/notification error:', e.message);
    }

    await ActivityLog.create({
      company: req.companyId,
      user: req.user._id,
      action: `Assigned project "${project.name}" to manager ${manager.fullName}`,
      entity: 'project',
      entityId: project._id,
    });

    return res.status(200).json({ success: true, data: project });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ━━━ DELETE TASK ━━━
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.taskId, company: req.companyId });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found', errors: [] });
    }

    const project = await Project.findById(task.project);
    if (req.user.role === 'manager' && project.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized', errors: [] });
    }

    await Task.findByIdAndDelete(req.params.taskId);

    if (project) await project.calculateProgress();

    return res.status(200).json({ success: true, message: 'Task deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};
