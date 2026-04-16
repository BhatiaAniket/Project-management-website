const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Meeting = require('../models/Meeting');
const Company = require('../models/Company');
const mongoose = require('mongoose');

// Get overview stats
exports.getOverviewStats = async (req, res) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user.company);

    const [managers, employees, activeProjects, completedProjects, pendingTasks, meetings, company] = await Promise.all([
      User.countDocuments({ company: companyId, role: "manager" }),
      User.countDocuments({ company: companyId, role: "employee" }),
      Project.countDocuments({ company: companyId, status: "in_progress" }),
      Project.countDocuments({ company: companyId, status: "completed" }),
      Task.countDocuments({ company: companyId, status: { $nin: ["done", "completed"] } }),
      Meeting.countDocuments({ companyId: companyId, startTime: { $gte: new Date() } }),
      Company.findById(companyId).select("name")
    ]);

    return res.json({
      success: true,
      data: {
        companyName: company?.name || "",
        totalManagers: managers,
        totalEmployees: employees,
        activeProjects,
        completedProjects,
        pendingTasks,
        upcomingMeetings: meetings
      }
    });
  } catch (error) {
    console.error('Get overview stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overview stats',
      errors: [],
    });
  }
};

// Get projects progress
exports.getProjectsProgress = async (req, res) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.companyId || req.user.company);

    const projects = await Project.find({ company: companyId }).select("name progress status");

    const result = await Promise.all(projects.map(async (project) => {
      const total = await Task.countDocuments({ project: project._id });
      const done = await Task.countDocuments({ project: project._id, status: { $in: ['done', 'completed'] } }); 
      const progress = total > 0 ? Math.round((done / total) * 100) : 0;
      return {
        name: project.name,
        progress,
        status: project.status
      };
    }));

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get projects progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects progress',
      errors: [],
    });
  }
};

// Get tasks status summary
exports.getTasksStatusSummary = async (req, res) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.companyId || req.user.company);

    const [todo, inProgress, done, overdue] = await Promise.all([
      Task.countDocuments({ company: companyId, status: "todo" }),
      Task.countDocuments({ company: companyId, status: "in_progress" }),
      Task.countDocuments({ company: companyId, status: "completed" }),
      Task.countDocuments({ 
        company: companyId, 
        status: { $ne: "completed" },
        dueDate: { $lt: new Date() }
      })
    ]);

    res.status(200).json({
      success: true,
      data: { todo, inProgress, done, overdue }
    });
  } catch (error) {
    console.error('Get tasks status summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks status summary',
      errors: [],
    });
  }
};

// Get weekly productivity
exports.getWeeklyProductivity = async (req, res) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.companyId || req.user.company);
    
    // Count tasks completed per day for last 7 days
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const last7days = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(new Date().setHours(0,0,0,0));
      date.setDate(date.getDate() - i);
      const start = new Date(date);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      
      const completed = await Task.countDocuments({
        company: companyId,
        status: "completed",
        updatedAt: { $gte: start, $lte: end }
      });
      
      last7days.push({ 
        day: days[start.getDay()], 
        score: completed 
      });
    }

    res.status(200).json({
      success: true,
      data: last7days
    });
  } catch (error) {
    console.error('Get weekly productivity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weekly productivity',
      errors: [],
    });
  }
};

// Get upcoming deadlines
exports.getUpcomingDeadlines = async (req, res) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.companyId || req.user.company);
    const today = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    
    const projects = await Project.find({
      company: companyId,
      deadline: { $lte: thirtyDaysLater },
      status: { $ne: "completed" }
    })
    .populate("manager", "fullName")
    .sort({ deadline: 1 })
    .select("name deadline status manager progress");
    
    const formattedDeadlines = projects.map(project => {
      const daysRemaining = Math.ceil((project.deadline - today) / (1000 * 60 * 60 * 24));
      let colorClass = 'green';
      
      if (daysRemaining < 0) {
        colorClass = 'red';
      } else if (daysRemaining <= 2) {
        colorClass = 'orange';
      } else if (daysRemaining <= 7) {
        colorClass = 'yellow';
      }
      
      return {
        title: project.name,
        projectName: `Manager: ${project.manager?.fullName || 'Unassigned'}`,
        deadline: project.deadline,
        daysRemaining,
        colorClass
      };
    });

    res.status(200).json({
      success: true,
      data: formattedDeadlines
    });
  } catch (error) {
    console.error('Get upcoming deadlines error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming deadlines',
      errors: [],
    });
  }
};

// Get recent activity
exports.getRecentActivity = async (req, res) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.companyId || req.user.company);
    
    const [tasks, meetings, users] = await Promise.all([
      Task.find({ company: companyId }).sort({ updatedAt: -1 }).limit(10).populate('assignedTo', 'fullName'),
      Meeting.find({ companyId: companyId }).sort({ createdAt: -1 }).limit(5),
      User.find({ company: companyId }).sort({ createdAt: -1 }).limit(5)
    ]);
    
    const combined = [];
    
    tasks.forEach(t => {
      combined.push({
        type: "task",
        message: `${t.assignedTo?.fullName || 'Someone'} updated task "${t.title}" to ${t.status}`,
        timestamp: t.updatedAt,
        color: "blue"
      });
    });
    
    meetings.forEach(m => {
      combined.push({
        type: "meeting",
        message: `Meeting "${m.title}" scheduled`,
        timestamp: m.createdAt,
        color: "yellow"
      });
    });
    
    users.forEach(u => {
      combined.push({
        type: "user",
        message: `New user ${u.fullName} added`,
        timestamp: u.createdAt,
        color: "green"
      });
    });
    
    combined.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.status(200).json({
      success: true,
      data: combined.slice(0, 20)
    });
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activity',
      errors: [],
    });
  }
};

exports.getHoverDetails = async (req, res) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.companyId || req.user.company);
    const { type } = req.params;
    let data = [];

    switch (type) {
      case 'managers':
        data = await User.find({ company: companyId, role: "manager" })
          .select("fullName department position isActive");
        data = data.map(u => ({ name: u.fullName, department: u.department, position: u.position, isActive: u.isActive }));
        break;
      case 'active-projects':
        const activeProjects = await Project.find({ company: companyId, status: "in_progress" })
          .populate("manager", "fullName")
          .select("name manager deadline progress");
        data = activeProjects.map(p => ({
          name: p.name,
          assignedManagerName: p.manager?.fullName || 'Unassigned',
          deadline: p.deadline,
          progress: p.progress
        }));
        break;
      case 'completed-projects':
        const completedProjects = await Project.find({ company: companyId, status: "completed" })
          .populate("manager", "fullName")
          .select("name manager deadline progress updatedAt");
        data = completedProjects.map(p => ({
          name: p.name,
          assignedManagerName: p.manager?.fullName || 'Unassigned',
          completionDate: p.updatedAt
        }));
        break;
      case 'pending-tasks':
        data = await Task.find({ company: companyId, status: { $nin: ["done", "completed"] } })
          .sort({ priority: 1 })
          .limit(5)
          .select("title priority dueDate"); 
        break;
      case 'meetings':
        data = await Meeting.find({ companyId: companyId, startTime: { $gte: new Date() } })
          .sort({ startTime: 1 })
          .limit(3)
          .select("title startTime participants");
        data = data.map(m => ({
          title: m.title,
          date: m.startTime,
          participantCount: m.participants?.length || 0
        }));
        break;
      default:
        data = [];
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Get hover details error:', error);
    res.status(500).json({ success: false, message: 'Hover fetch failed', errors: [] });
  }
};

exports.getPerformanceSummary = async (req, res) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.companyId || req.user.company);
    
    const employees = await User.find({ company: companyId, role: "employee" });
    
    const performanceData = await Promise.all(
      employees.map(async (emp) => {
        const total = await Task.countDocuments({ assignedTo: emp._id });
        const done = await Task.countDocuments({ assignedTo: emp._id, status: "completed" });
        const overdue = await Task.countDocuments({
          assignedTo: emp._id,
          status: { $ne: "completed" },
          dueDate: { $lt: new Date() }
        });
        const score = total > 0 ? Math.round((done / total) * 100) : 0;
        return { name: emp.fullName, role: emp.role, score, total, done, overdue };
      })
    );
    
    performanceData.sort((a, b) => b.score - a.score);

    res.status(200).json({ success: true, data: performanceData });
  } catch (error) {
    console.error('Get performance summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch performance summary', errors: [] });
  }
};
