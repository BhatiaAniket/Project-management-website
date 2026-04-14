/**
 * Cron Service
 * Manages scheduled jobs for deadline reminders and meeting reminders.
 */
const cron = require('node-cron');
const Project = require('../models/Project');
const Meeting = require('../models/Meeting');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendDeadlineReminderEmail, sendMeetingReminderEmail } = require('./email.service');

/**
 * Initialize all cron jobs
 */
const initCronJobs = () => {
  console.log('  ⏰ Cron jobs initialized');

  // Check project deadlines every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('Running deadline reminder check...');
    await checkProjectDeadlines();
  });

  // Check meeting reminders every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    await checkMeetingReminders();
  });
};

/**
 * Check for upcoming project deadlines and send reminders
 */
const checkProjectDeadlines = async () => {
  try {
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const oneDay = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    // Find projects with upcoming deadlines
    const projects = await Project.find({
      status: { $in: ['not_started', 'in_progress'] },
      deadline: { $lte: sevenDays, $gte: now },
    }).populate('manager', 'fullName email');

    for (const project of projects) {
      if (!project.manager) continue;

      const daysLeft = Math.ceil((project.deadline - now) / (1000 * 60 * 60 * 24));
      let shouldSend = false;

      if (daysLeft <= 1 && !project.remindersSent.oneDay) {
        project.remindersSent.oneDay = true;
        shouldSend = true;
      } else if (daysLeft <= 3 && !project.remindersSent.threeDay) {
        project.remindersSent.threeDay = true;
        shouldSend = true;
      } else if (daysLeft <= 7 && !project.remindersSent.sevenDay) {
        project.remindersSent.sevenDay = true;
        shouldSend = true;
      }

      if (shouldSend) {
        // Send email reminder
        try {
          await sendDeadlineReminderEmail({
            managerName: project.manager.fullName,
            managerEmail: project.manager.email,
            projectName: project.name,
            deadline: project.deadline,
            daysLeft,
          });
        } catch (emailErr) {
          console.error(`Failed to send deadline email for project ${project.name}:`, emailErr.message);
        }

        // Create in-app notification
        await Notification.create({
          company: project.company,
          user: project.manager._id,
          type: 'deadline_approaching',
          title: 'Deadline Approaching',
          message: `Project "${project.name}" is due in ${daysLeft} day(s).`,
          relatedId: project._id,
          relatedModel: 'Project',
        });

        await project.save();
      }
    }
  } catch (error) {
    console.error('Deadline check error:', error.message);
  }
};

/**
 * Check for meetings starting in ~30 minutes and send reminders
 */
const checkMeetingReminders = async () => {
  try {
    const now = new Date();
    const thirtyMinFromNow = new Date(now.getTime() + 30 * 60 * 1000);
    const twentyMinFromNow = new Date(now.getTime() + 20 * 60 * 1000);

    // Find meetings starting in approximately 30 minutes
    const meetings = await Meeting.find({
      status: 'scheduled',
      reminderSent: false,
      date: { $gte: twentyMinFromNow, $lte: thirtyMinFromNow },
    }).populate('participants', 'fullName email');

    for (const meeting of meetings) {
      for (const participant of meeting.participants) {
        try {
          await sendMeetingReminderEmail({
            participantName: participant.fullName,
            participantEmail: participant.email,
            meetingTitle: meeting.title,
            meetingDate: meeting.date,
            duration: meeting.duration,
          });
        } catch (emailErr) {
          console.error(`Failed to send meeting reminder to ${participant.email}:`, emailErr.message);
        }

        // In-app notification
        await Notification.create({
          company: meeting.company,
          user: participant._id,
          type: 'meeting_starting',
          title: 'Meeting Starting Soon',
          message: `"${meeting.title}" starts in 30 minutes.`,
          relatedId: meeting._id,
          relatedModel: 'Meeting',
        });
      }

      meeting.reminderSent = true;
      await meeting.save();
    }
  } catch (error) {
    console.error('Meeting reminder check error:', error.message);
  }
};

module.exports = { initCronJobs };
