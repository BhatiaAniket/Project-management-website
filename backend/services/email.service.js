const sendEmail = require('../utils/sendEmail');
const { getVerificationEmailTemplate } = require('../utils/emailTemplates');

/**
 * Send welcome email to imported users with temporary password
 */
const sendWelcomeEmail = async ({ name, email, role, tempPassword }) => {
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; background: #f5f5f0; padding: 40px 20px; }
        .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 40px; border: 1px solid #e0e0da; }
        .logo { font-size: 24px; font-weight: 700; color: #0a0a0a; margin-bottom: 24px; }
        .badge { display: inline-block; background: #0a0a0a; color: #ffffff; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 24px; }
        h1 { font-size: 22px; color: #0a0a0a; margin-bottom: 16px; }
        p { color: #555; font-size: 14px; line-height: 1.7; margin-bottom: 12px; }
        .credentials { background: #f5f5f0; border: 1px solid #e0e0da; border-radius: 12px; padding: 20px; margin: 24px 0; }
        .credentials p { margin-bottom: 8px; color: #0a0a0a; }
        .credentials strong { color: #0a0a0a; }
        .btn { display: inline-block; background: #0a0a0a; color: #ffffff; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 16px; }
        .warning { background: #fff3cd; border: 1px solid #ffc107; border-radius: 10px; padding: 12px 16px; font-size: 13px; color: #856404; margin-top: 20px; }
        .footer { margin-top: 32px; font-size: 12px; color: #999; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">CognifyPM</div>
        <div class="badge">${role}</div>
        <h1>Welcome to CognifyPM, ${name}! 🎉</h1>
        <p>Your account has been created. Use the credentials below to log in:</p>
        <div class="credentials">
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Temporary Password:</strong> ${tempPassword}</p>
          <p><strong>Role:</strong> ${role}</p>
        </div>
        <a href="${loginUrl}" class="btn">Login to CognifyPM →</a>
        <div class="warning">
          ⚠️ Please change your password after your first login. This temporary password will require a mandatory reset.
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} CognifyPM — AI-Powered Project Management</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'Welcome to CognifyPM — Your Account is Ready',
    html,
  });
};

/**
 * Send project deadline reminder email
 */
const sendDeadlineReminderEmail = async ({ managerName, managerEmail, projectName, deadline, daysLeft }) => {
  const urgencyColor = daysLeft <= 1 ? '#dc3545' : daysLeft <= 3 ? '#fd7e14' : '#28a745';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; background: #f5f5f0; padding: 40px 20px; }
        .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 40px; border: 1px solid #e0e0da; }
        .logo { font-size: 24px; font-weight: 700; color: #0a0a0a; margin-bottom: 24px; }
        h1 { font-size: 20px; color: #0a0a0a; margin-bottom: 16px; }
        p { color: #555; font-size: 14px; line-height: 1.7; }
        .urgency { display: inline-block; background: ${urgencyColor}; color: #fff; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-bottom: 20px; }
        .details { background: #f5f5f0; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e0e0da; }
        .footer { margin-top: 32px; font-size: 12px; color: #999; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">CognifyPM</div>
        <div class="urgency">${daysLeft <= 1 ? '🔴 Due Tomorrow' : daysLeft <= 3 ? '🟠 Due Soon' : '🟢 Upcoming'}</div>
        <h1>Project Deadline Reminder</h1>
        <p>Hi ${managerName},</p>
        <p>This is a reminder that the following project deadline is approaching:</p>
        <div class="details">
          <p><strong>Project:</strong> ${projectName}</p>
          <p><strong>Deadline:</strong> ${new Date(deadline).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p><strong>Days Remaining:</strong> ${daysLeft} day(s)</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} CognifyPM</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: managerEmail,
    subject: `⏰ Deadline Reminder: ${projectName} — ${daysLeft} day(s) left`,
    html,
  });
};

/**
 * Send meeting reminder email
 */
const sendMeetingReminderEmail = async ({ participantName, participantEmail, meetingTitle, meetingDate, duration }) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; background: #f5f5f0; padding: 40px 20px; }
        .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 40px; border: 1px solid #e0e0da; }
        .logo { font-size: 24px; font-weight: 700; color: #0a0a0a; margin-bottom: 24px; }
        h1 { font-size: 20px; color: #0a0a0a; margin-bottom: 16px; }
        p { color: #555; font-size: 14px; line-height: 1.7; }
        .details { background: #f5f5f0; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e0e0da; }
        .btn { display: inline-block; background: #0a0a0a; color: #ffffff; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 16px; }
        .footer { margin-top: 32px; font-size: 12px; color: #999; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">CognifyPM</div>
        <h1>📅 Meeting Starting Soon</h1>
        <p>Hi ${participantName},</p>
        <p>Your meeting is starting in 30 minutes:</p>
        <div class="details">
          <p><strong>Meeting:</strong> ${meetingTitle}</p>
          <p><strong>Time:</strong> ${new Date(meetingDate).toLocaleString()}</p>
          <p><strong>Duration:</strong> ${duration} minutes</p>
        </div>
        <a href="${process.env.FRONTEND_URL}/company/meetings" class="btn">Open CognifyPM →</a>
        <div class="footer">
          <p>© ${new Date().getFullYear()} CognifyPM</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: participantEmail,
    subject: `📅 Meeting in 30 min: ${meetingTitle}`,
    html,
  });
};

module.exports = {
  sendWelcomeEmail,
  sendDeadlineReminderEmail,
  sendMeetingReminderEmail,
};
