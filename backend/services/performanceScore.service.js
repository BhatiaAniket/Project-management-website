/**
 * performanceScore.service.js
 * Unified scoring engine for CognifyPM.
 *
 * NOTE — actual field names in DB:
 *   Task:    project (ObjectId), company (ObjectId), dueDate (Date), status: ['todo','in_progress','under_review','completed','overdue']
 *   Project: company (ObjectId), manager (ObjectId)
 *   User:    company (ObjectId), fullName (String), avatar (String)
 */

const Task = require('../models/Task');
const Project = require('../models/Project');
const ManagerRating = require('../models/ManagerRating');
const toObjectId = require('../utils/toObjectId');

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE SCORE  (0 – 1000)
// ─────────────────────────────────────────────────────────────────────────────
const calculateEmployeeScore = async (employeeId, companyId) => {
  const empId = toObjectId(employeeId);
  const compId = toObjectId(companyId);
  const now = new Date();

  const allTasks = await Task.find({ assignedTo: empId, company: compId });

  if (allTasks.length === 0) {
    return {
      score: 0,
      rawPoints: 0,
      breakdown: {
        completedOnTime: 0,
        completedLate: 0,
        overdue: 0,
        inProgress: 0,
        total: 0,
        managerRatingAvg: 0,
        pointsFromTasks: 0,
        pointsFromRatings: 0,
      },
    };
  }

  let points = 0;
  let completedOnTime = 0;
  let completedLate = 0;
  let overdue = 0;
  let inProgress = 0;

  for (const task of allTasks) {
    const isDone = task.status === 'completed';
    const hasDeadline = !!task.dueDate;
    const deadlinePassed = hasDeadline && new Date(task.dueDate) < now;

    if (isDone) {
      // Use completedAt if available, otherwise updatedAt
      const completedAt = task.completedAt || task.updatedAt;
      const onTime = !hasDeadline || completedAt <= new Date(task.dueDate);

      if (onTime) {
        points += 100; // +100 completed on time
        completedOnTime++;
      } else {
        points -= 100; // -100 completed late
        completedLate++;
      }
    } else if (deadlinePassed) {
      points -= 100; // -100 not completed past deadline
      overdue++;
    } else {
      inProgress++;
    }
  }

  // Manager ratings contribution
  const ratings = await ManagerRating.find({ employeeId: empId, company: compId });

  let managerRatingAvg = 0;
  let pointsFromRatings = 0;

  if (ratings.length > 0) {
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    managerRatingAvg = sum / ratings.length;
    // Convert 1-5 rating → -100 to +100 scale (rating 5 = +100, rating 3 = 0, rating 1 = -100)
    pointsFromRatings = Math.round(
      ratings.reduce((acc, r) => acc + ((r.rating - 3) / 2) * 100, 0) / ratings.length
    );
    points += pointsFromRatings;
  }

  // Normalize to 0-1000 scale
  const maxPoints = allTasks.length * 100;
  const normalizedScore =
    maxPoints > 0
      ? Math.max(0, Math.min(1000, Math.round((points / maxPoints) * 1000)))
      : 0;

  const pointsFromTasks = points - pointsFromRatings;

  return {
    score: normalizedScore,
    rawPoints: points,
    breakdown: {
      total: allTasks.length,
      completedOnTime,
      completedLate,
      overdue,
      inProgress,
      managerRatingAvg: Math.round(managerRatingAvg * 10) / 10,
      pointsFromTasks,
      pointsFromRatings,
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// MANAGER SCORE  (0 – 1000)
// Team Output 500 + Process Quality 300 + Own Tasks 200
// ─────────────────────────────────────────────────────────────────────────────
const calculateManagerScore = async (managerId, companyId) => {
  const mgrId = toObjectId(managerId);
  const compId = toObjectId(companyId);
  const now = new Date();

  // Manager's projects (field names: manager, company — NOT assignedManager/companyId)
  const projects = await Project.find({ manager: mgrId, company: compId });
  const projectIds = projects.map((p) => p._id);

  if (projectIds.length === 0) {
    return {
      score: 0,
      breakdown: {
        teamScore: 0,
        processScore: 0,
        ownScore: 0,
        teamTotal: 0,
        teamDone: 0,
        teamOverdue: 0,
        teamOnTime: 0,
        unassignedTasks: 0,
        reassignedTasks: 0,
        staleTasks: 0,
        teamCompletionRate: 0,
        teamOverdueRate: 0,
      },
    };
  }

  // ── TEAM OUTPUT SCORE (50% → max 500) ─────────────────────────────────────
  const [teamTotal, teamDone, teamOverdue, teamLate] = await Promise.all([
    Task.countDocuments({ project: { $in: projectIds } }),
    Task.countDocuments({ project: { $in: projectIds }, status: 'completed' }),
    Task.countDocuments({
      project: { $in: projectIds },
      status: { $nin: ['completed'] },
      dueDate: { $lt: now },
    }),
    Task.countDocuments({
      project: { $in: projectIds },
      status: 'completed',
      $expr: { $gt: ['$completedAt', '$dueDate'] },
    }),
  ]);

  let teamPoints = 0;
  const teamOnTime = Math.max(0, teamDone - teamLate);
  teamPoints += teamOnTime * 100;
  teamPoints -= teamLate * 100;
  teamPoints -= teamOverdue * 100;

  const teamScore =
    teamTotal > 0
      ? Math.max(0, Math.round((teamPoints / (teamTotal * 100)) * 500))
      : 250; // neutral if no tasks

  // ── PROCESS QUALITY SCORE (30% → max 300) ─────────────────────────────────
  const [unassignedTasks, reassignedTasks, staleTasks] = await Promise.all([
    Task.countDocuments({
      project: { $in: projectIds },
      $or: [{ assignedTo: null }, { assignedTo: { $exists: false } }],
    }),
    Task.countDocuments({
      project: { $in: projectIds },
      reassignmentCount: { $gt: 0 },
    }),
    Task.countDocuments({
      project: { $in: projectIds },
      status: { $nin: ['completed'] },
      dueDate: { $lt: now },
      updatedAt: { $lt: new Date(now - 3 * 24 * 60 * 60 * 1000) },
    }),
  ]);

  let processDeductions = 0;
  processDeductions += unassignedTasks * 50; // -50 per unassigned
  processDeductions += reassignedTasks * 30; // -30 per reassignment
  processDeductions += staleTasks * 40; // -40 per stale overdue

  const processScore = Math.max(0, 300 - processDeductions);

  // ── OWN TASKS SCORE (20% → max 200) ───────────────────────────────────────
  const [ownTotal, ownDone, ownOverdue] = await Promise.all([
    Task.countDocuments({ assignedTo: mgrId, company: compId }),
    Task.countDocuments({ assignedTo: mgrId, company: compId, status: 'completed' }),
    Task.countDocuments({
      assignedTo: mgrId,
      company: compId,
      status: { $nin: ['completed'] },
      dueDate: { $lt: now },
    }),
  ]);

  let ownPoints = 0;
  ownPoints += ownDone * 100;
  ownPoints -= ownOverdue * 100;
  const ownScore =
    ownTotal > 0
      ? Math.max(0, Math.round((ownPoints / (ownTotal * 100)) * 200))
      : 100; // neutral if no own tasks

  // ── FINAL SCORE ────────────────────────────────────────────────────────────
  const finalScore = Math.min(1000, teamScore + processScore + ownScore);

  return {
    score: finalScore,
    breakdown: {
      teamScore,
      processScore,
      ownScore,
      teamTotal,
      teamDone,
      teamOverdue,
      teamOnTime,
      unassignedTasks,
      reassignedTasks,
      staleTasks,
      teamCompletionRate: teamTotal > 0 ? Math.round((teamDone / teamTotal) * 100) : 0,
      teamOverdueRate: teamTotal > 0 ? Math.round((teamOverdue / teamTotal) * 100) : 0,
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// SCORE LABEL HELPER
// ─────────────────────────────────────────────────────────────────────────────
const getScoreLabel = (score) => {
  if (score >= 800) return { label: 'Excellent', color: 'green', emoji: '🟢' };
  if (score >= 600) return { label: 'Good', color: 'blue', emoji: '🔵' };
  if (score >= 400) return { label: 'Average', color: 'yellow', emoji: '🟡' };
  if (score >= 200) return { label: 'Needs Work', color: 'orange', emoji: '🟠' };
  return { label: 'Critical', color: 'red', emoji: '🔴' };
};

module.exports = { calculateEmployeeScore, calculateManagerScore, getScoreLabel };
