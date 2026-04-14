const User = require('../models/User');
const Company = require('../models/Company');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Meeting = require('../models/Meeting');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');

// ━━━ GET OVERVIEW STATS ━━━
exports.getOverview = async (req, res) => {
  try {
    const companyId = req.companyId;

    const [
      totalManagers,
      totalEmployees,
      activeProjects,
      completedProjects,
      pendingTasks,
      upcomingMeetings,
    ] = await Promise.all([
      User.countDocuments({ company: companyId, role: 'manager', isActive: true }),
      User.countDocuments({ company: companyId, role: 'employee', isActive: true }),
      Project.countDocuments({ company: companyId, status: 'in_progress' }),
      Project.countDocuments({ company: companyId, status: 'completed' }),
      Task.countDocuments({ company: companyId, status: { $in: ['todo', 'in_progress'] } }),
      Meeting.countDocuments({ company: companyId, status: 'scheduled', date: { $gte: new Date() } }),
    ]);

    // Project progress data for chart
    const projects = await Project.find({ company: companyId, status: { $ne: 'archived' } })
      .select('name progress status')
      .limit(10)
      .sort({ updatedAt: -1 });

    // Task status distribution for donut chart
    const taskDistribution = await Task.aggregate([
      { $match: { company: require('mongoose').Types.ObjectId(companyId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Upcoming deadlines (within 7 days)
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingDeadlines = await Project.find({
      company: companyId,
      status: { $in: ['not_started', 'in_progress'] },
      deadline: { $lte: sevenDaysFromNow },
    })
      .select('name deadline progress status')
      .sort({ deadline: 1 })
      .limit(10);

    // Recent activity
    const recentActivity = await ActivityLog.find({ company: companyId })
      .populate('user', 'fullName avatar')
      .sort({ createdAt: -1 })
      .limit(10);

    // Company info (for onboarding)
    const company = await Company.findById(companyId).select('name onboarding subscription');

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          totalManagers,
          totalEmployees,
          activeProjects,
          completedProjects,
          pendingTasks,
          upcomingMeetings,
        },
        projects,
        taskDistribution,
        upcomingDeadlines,
        recentActivity,
        company,
      },
    });
  } catch (error) {
    console.error('Overview error:', error);
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ━━━ GET ACTIVITY LOG ━━━
exports.getActivityLog = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const activities = await ActivityLog.find({ company: req.companyId })
      .populate('user', 'fullName avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await ActivityLog.countDocuments({ company: req.companyId });

    return res.status(200).json({
      success: true,
      data: { activities, total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ━━━ UPDATE COMPANY PROFILE ━━━
exports.updateProfile = async (req, res) => {
  try {
    const { name, location, industry, logo, departments } = req.body;
    const company = await Company.findByIdAndUpdate(
      req.companyId,
      { name, location, industry, logo, departments },
      { new: true, runValidators: true }
    );

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found', errors: [] });
    }

    // Log activity
    await ActivityLog.create({
      company: req.companyId,
      user: req.user._id,
      action: 'Updated company profile',
      entity: 'company',
      entityId: company._id,
    });

    return res.status(200).json({ success: true, data: company });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ━━━ GET COMPANY DETAILS ━━━
exports.getCompanyDetails = async (req, res) => {
  try {
    const company = await Company.findById(req.companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found', errors: [] });
    }
    return res.status(200).json({ success: true, data: company });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ━━━ GET PROJECTS PROGRESS ━━━
exports.getProjectsProgress = async (req, res) => {
  try {
    const companyId = req.companyId;
    
    const projects = await Project.find({ 
      company: companyId, 
      status: { $ne: 'archived' } 
    })
    .select('name progress status')
    .limit(10)
    .sort({ updatedAt: -1 });

    const progressData = projects.map(project => ({
      name: project.name,
      progress: project.progress || 0,
    }));

    return res.status(200).json({ success: true, data: progressData });
  } catch (error) {
    console.error('Get projects progress error:', error);
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ━━━ GET TASKS STATUS SUMMARY ━━━
exports.getTasksStatusSummary = async (req, res) => {
  try {
    const companyId = req.companyId;

    const taskDistribution = await Task.aggregate([
      { $match: { company: require('mongoose').Types.ObjectId(companyId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const summary = {
      todo: 0,
      inProgress: 0,
      done: 0,
      overdue: 0,
    };

    taskDistribution.forEach(item => {
      switch (item._id) {
        case 'todo':
          summary.todo = item.count;
          break;
        case 'in_progress':
          summary.inProgress = item.count;
          break;
        case 'completed':
          summary.done = item.count;
          break;
        case 'overdue':
          summary.overdue = item.count;
          break;
      }
    });

    return res.status(200).json({ success: true, data: summary });
  } catch (error) {
    console.error('Get tasks status summary error:', error);
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ━━━ GET WEEKLY PRODUCTIVITY ━━━
exports.getWeeklyProductivity = async (req, res) => {
  try {
    const companyId = req.companyId;
    
    // Get last 7 days of completed tasks
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const productivityData = await Task.aggregate([
      {
        $match: {
          company: require('mongoose').Types.ObjectId(companyId),
          completedAt: { $gte: sevenDaysAgo },
          status: 'completed',
        },
      },
      {
        $group: {
          _id: { $dayOfWeek: '$completedAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Map to day names
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyData = dayNames.map((day, index) => {
      const dayData = productivityData.find(d => d._id === (index + 1));
      return {
        day,
        score: dayData ? Math.min((dayData.count * 20), 100) : 0,
      };
    });

    return res.status(200).json({ success: true, data: weeklyData });
  } catch (error) {
    console.error('Get weekly productivity error:', error);
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ━━━ IMPORT PEOPLE ━━━
exports.importPeople = async (req, res) => {
  try {
    const companyId = req.companyId;
    
    // This will be implemented with file parsing logic
    // For now, return a placeholder response
    return res.status(200).json({
      success: true,
      message: 'File import endpoint ready for implementation',
      data: {
        imported: 0,
        failed: [],
        alreadyExists: [],
      },
    });
  } catch (error) {
    console.error('Import people error:', error);
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};
