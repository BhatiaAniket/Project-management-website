const User = require('../models/User');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { generatePerformanceSummary } = require('../services/openai.service');

// ━━━ LIST PERFORMANCE ━━━
exports.listPerformance = async (req, res) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const query = { company: req.companyId, isActive: true };

    if (role) query.role = role;
    else query.role = { $in: ['manager', 'employee'] };

    if (req.user.role === 'manager') {
      const myProjects = await Project.find({ manager: req.user._id, company: req.companyId }).select('team');
      const teamIds = [];
      myProjects.forEach(p => {
        if (p.team) teamIds.push(...p.team);
      });
      query._id = { $in: teamIds };
    }

    const people = await User.find(query)
      .select('fullName email role department position avatar lastActive')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Calculate stats for each person
    const performanceData = await Promise.all(
      people.map(async (person) => {
        const [tasksAssigned, tasksCompleted, tasksOverdue] = await Promise.all([
          Task.countDocuments({ assignedTo: person._id, company: req.companyId }),
          Task.countDocuments({ assignedTo: person._id, company: req.companyId, status: 'completed' }),
          Task.countDocuments({ assignedTo: person._id, company: req.companyId, status: 'overdue' }),
        ]);

        // Calculate on-time rate
        const completedTasks = await Task.find({
          assignedTo: person._id,
          company: req.companyId,
          status: 'completed',
        }).select('dueDate completedAt');

        const onTimeTasks = completedTasks.filter(
          (t) => !t.dueDate || (t.completedAt && t.completedAt <= t.dueDate)
        ).length;

        const onTimeRate = tasksCompleted > 0 ? Math.round((onTimeTasks / tasksCompleted) * 100) : 100;

        // Productivity score (0-100)
        const completionRate = tasksAssigned > 0 ? tasksCompleted / tasksAssigned : 0;
        const productivityScore = Math.round(completionRate * 50 + (onTimeRate / 100) * 50);

        return {
          _id: person._id,
          fullName: person.fullName,
          email: person.email,
          role: person.role,
          department: person.department,
          position: person.position,
          avatar: person.avatar,
          lastActive: person.lastActive,
          tasksAssigned,
          tasksCompleted,
          tasksOverdue,
          onTimeRate,
          productivityScore,
        };
      })
    );

    const total = await User.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: { performance: performanceData, total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Performance list error:', error);
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ━━━ GET INDIVIDUAL PERFORMANCE ━━━
exports.getIndividualPerformance = async (req, res) => {
  try {
    const { userId } = req.params;

    const person = await User.findOne({ _id: userId, company: req.companyId })
      .select('fullName email role department position avatar lastActive');

    if (!person) {
      return res.status(404).json({ success: false, message: 'Person not found', errors: [] });
    }

    const tasks = await Task.find({ assignedTo: userId, company: req.companyId })
      .populate('project', 'name')
      .sort({ createdAt: -1 });

    const tasksAssigned = tasks.length;
    const tasksCompleted = tasks.filter((t) => t.status === 'completed').length;
    const tasksOverdue = tasks.filter((t) => t.status === 'overdue').length;
    const tasksInProgress = tasks.filter((t) => t.status === 'in_progress').length;

    const onTimeTasks = tasks.filter(
      (t) => t.status === 'completed' && (!t.dueDate || t.completedAt <= t.dueDate)
    ).length;
    const onTimeRate = tasksCompleted > 0 ? Math.round((onTimeTasks / tasksCompleted) * 100) : 100;

    // Project-wise contribution
    const projectContribution = {};
    tasks.forEach((t) => {
      const pName = t.project?.name || 'Unassigned';
      if (!projectContribution[pName]) {
        projectContribution[pName] = { total: 0, completed: 0 };
      }
      projectContribution[pName].total++;
      if (t.status === 'completed') projectContribution[pName].completed++;
    });

    // Weekly productivity (last 8 weeks)
    const weeklyData = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekCompleted = tasks.filter(
        (t) => t.completedAt && t.completedAt >= weekStart && t.completedAt < weekEnd
      ).length;

      weeklyData.push({
        week: `W${8 - i}`,
        completed: weekCompleted,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        person,
        stats: { tasksAssigned, tasksCompleted, tasksOverdue, tasksInProgress, onTimeRate },
        projectContribution: Object.entries(projectContribution).map(([name, data]) => ({ name, ...data })),
        weeklyData,
        recentTasks: tasks.slice(0, 10),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ━━━ GENERATE AI SUMMARY ━━━
exports.generateAISummary = async (req, res) => {
  try {
    const { userId } = req.params;

    const person = await User.findOne({ _id: userId, company: req.companyId })
      .select('fullName role');

    if (!person) {
      return res.status(404).json({ success: false, message: 'Person not found', errors: [] });
    }

    const tasks = await Task.find({ assignedTo: userId, company: req.companyId });
    const projects = await Project.find({ company: req.companyId, team: userId }).select('name');

    const tasksAssigned = tasks.length;
    const tasksCompleted = tasks.filter((t) => t.status === 'completed').length;
    const tasksOverdue = tasks.filter((t) => t.status === 'overdue').length;
    const onTimeTasks = tasks.filter(
      (t) => t.status === 'completed' && (!t.dueDate || t.completedAt <= t.dueDate)
    ).length;
    const onTimeRate = tasksCompleted > 0 ? Math.round((onTimeTasks / tasksCompleted) * 100) : 100;

    const summary = await generatePerformanceSummary({
      name: person.fullName,
      role: person.role,
      tasksAssigned,
      tasksCompleted,
      tasksOverdue,
      onTimeRate,
      recentProjects: projects.map((p) => p.name),
    });

    return res.status(200).json({ success: true, data: { summary } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};
