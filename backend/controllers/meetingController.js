const Meeting = require('../models/Meeting');
const User = require('../models/User');
const Company = require('../models/Company');
const { OpenAI } = require('openai');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// WebRTC signaling server would be implemented here with Socket.io
// This is a simplified version for demonstration

// Create a new meeting
exports.createMeeting = async (req, res) => {
  try {
    console.log('Meeting creation request body:', req.body);
    const { title, agenda, type, startTime, durationMinutes, participants } = req.body;
    const companyId = req.companyId || (req.user && req.user.companyId);
    const userId = req.user && (req.user.id || req.user._id);

    // Validate required fields
    if (!title || !startTime || !durationMinutes) {
      return res.status(400).json({
        success: false,
        message: 'Title, start time, and duration are required',
        errors: [],
      });
    }

    // Validate start time format
    const parsedStart = new Date(startTime);
    if (isNaN(parsedStart.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startTime format',
        errors: [],
      });
    }

    // Validate participants
    const { ObjectId } = require('mongoose').Types;
    const validParticipants = Array.isArray(participants)
      ? participants.filter(id => ObjectId.isValid(id))
      : [];

    if (validParticipants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one valid participant is required',
        errors: [],
      });
    }

    const meeting = new Meeting({
      title,
      agenda,
      type: type || 'one-on-one',
      startTime: parsedStart,
      durationMinutes,
      companyId,
      createdBy: userId,
      participants: validParticipants,
      status: 'scheduled',
    });

    await meeting.save();

    // Populate meeting details
    await meeting.populate([
      { path: 'participants', select: 'fullName email avatar' },
      { path: 'createdBy', select: 'fullName' },
    ]);

    // Send email notifications to participants (mock for now)
    try {
      console.log(`Meeting scheduled: ${title} at ${new Date(startTime).toLocaleString()}`);
      console.log(`Participants: ${participants.length}`);

      // Schedule reminder 30 minutes before meeting
      const reminderTime = new Date(startTime.getTime() - 30 * 60 * 1000);
      if (reminderTime > new Date()) {
        console.log(`Reminder scheduled for: ${reminderTime.toLocaleString()}`);
      }
    } catch (emailError) {
      console.error('Failed to send email notifications:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Meeting created successfully',
      data: meeting,
    });
  } catch (error) {
    console.error('Create meeting error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create meeting',
      errors: [],
    });
  }
};

// Join a meeting
exports.joinMeeting = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const meeting = await Meeting.findOne({ roomId, company: req.companyId })
      .populate('participants createdBy')
      .populate('project', 'name');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found',
        errors: [],
      });
    }

    // Check if user is allowed to join
    const isParticipant = meeting.participants.some(p => p._id.toString() === userId);
    const isCreator = meeting.createdBy._id.toString() === userId;

    if (!isParticipant && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to join this meeting',
        errors: [],
      });
    }

    // Check if meeting has started or is about to start (within 10 minutes)
    const now = new Date();
    const meetingTime = new Date(meeting.startTime);
    const tenMinutesBefore = new Date(meetingTime.getTime() - 10 * 60 * 1000);

    if (now < tenMinutesBefore) {
      return res.status(400).json({
        success: false,
        message: 'Meeting has not started yet',
        errors: [],
        data: {
          canJoinAt: tenMinutesBefore,
        },
      });
    }

    // Update meeting status to active if not already
    if (meeting.status === 'scheduled') {
      meeting.status = 'active';
      await meeting.save();
    }

    // Add user to meeting room (Socket.io)
    req.io.to(roomId).emit('participant:joined', {
      userId,
      userName: req.user.fullName,
      userAvatar: req.user.avatar,
    });

    res.status(200).json({
      success: true,
      data: {
        meeting,
        roomId: meeting.roomId,
        canJoin: true,
      },
    });
  } catch (error) {
    console.error('Join meeting error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join meeting',
      errors: [],
    });
  }
};

// Leave a meeting
exports.leaveMeeting = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const meeting = await Meeting.findOne({ roomId, company: req.companyId });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found',
        errors: [],
      });
    }

    // Emit participant left event
    req.io.to(roomId).emit('participant:left', {
      userId,
      userName: req.user.fullName,
    });

    res.status(200).json({
      success: true,
      message: 'Left meeting successfully',
    });
  } catch (error) {
    console.error('Leave meeting error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave meeting',
      errors: [],
    });
  }
};

// End meeting and generate AI summary
exports.endMeeting = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { transcript, recordingUrl } = req.body;
    const userId = req.user.id;

    const meeting = await Meeting.findOne({ roomId, company: req.companyId })
      .populate('participants createdBy')
      .populate('project', 'name');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found',
        errors: [],
      });
    }

    // Check if user is the meeting creator
    if (meeting.createdBy._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the meeting creator can end the meeting',
        errors: [],
      });
    }

    // Update meeting status
    meeting.status = 'ended';
    meeting.endedAt = new Date();
    meeting.recordingUrl = recordingUrl || null;

    // Generate AI summary
    let aiSummary = '';
    try {
      if (transcript && transcript.length > 0) {
        const summaryPrompt = `
        Generate a comprehensive meeting summary from this transcript:

        Meeting Title: ${meeting.title}
        Meeting Type: ${meeting.type}
        Participants: ${meeting.participants.map(p => p.fullName).join(', ')}
        
        Transcript:
        ${transcript}
        
        Please provide:
        1. Key discussion points
        2. Action items with assigned owners
        3. Decisions made
        4. Next steps or follow-up items
        5. Any important deadlines or milestones
        
        Format the response in a clear, structured way.
        `;

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an AI assistant that generates professional meeting summaries. Be concise but comprehensive.',
            },
            {
              role: 'user',
              content: summaryPrompt,
            },
          ],
          max_tokens: 1000,
          temperature: 0.7,
        });

        aiSummary = completion.choices[0].message.content;
      }
    } catch (aiError) {
      console.error('AI summary generation error:', aiError);
      aiSummary = 'AI summary generation failed. Please review the transcript manually.';
    }

    meeting.summary = {
      rawSummary: aiSummary,
      keyPoints: [],
      actionItems: [],
      decisions: []
    };
    
    if (transcript) {
      meeting.transcript = transcript;
    }

    await meeting.save();

    // Emit meeting ended event
    req.io.to(roomId).emit('meeting:ended', {
      meetingId: meeting._id,
      summary: aiSummary,
      recordingUrl,
    });

    res.status(200).json({
      success: true,
      data: {
        meeting,
        summary: aiSummary,
      },
    });
  } catch (error) {
    console.error('End meeting error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end meeting',
      errors: [],
    });
  }
};

// Get meeting summary
exports.getMeetingSummary = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meeting = await Meeting.findOne({
      _id: meetingId,
      company: req.companyId,
      status: 'ended'
    })
      .populate('participants createdBy')
      .populate('project', 'name');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found or not ended',
        errors: [],
      });
    }

    // Check if user is allowed to view summary
    const isParticipant = meeting.participants.some(p => p._id.toString() === req.user.id);
    const isCreator = meeting.createdBy._id.toString() === req.user.id;

    if (!isParticipant && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this meeting summary',
        errors: [],
      });
    }

    res.status(200).json({
      success: true,
      data: {
        meeting,
        summary: meeting.summary,
      },
    });
  } catch (error) {
    console.error('Get meeting summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get meeting summary',
      errors: [],
    });
  }
};

// Get user's meetings
exports.getUserMeetings = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const userId = req.user && (req.user.id || req.user._id);
    const companyId = req.companyId || (req.user && req.user.companyId);

    const query = {
      companyId,
      $or: [
        { createdBy: userId },
        { participants: userId }
      ]
    };

    if (status === 'upcoming') {
      query.status = { $in: ['scheduled', 'active'] };
    } else if (status === 'past') {
      query.status = { $in: ['ended', 'cancelled'] };
    } else if (status) {
      query.status = status;
    }

    const meetings = await Meeting.find(query)
      .populate('createdBy', 'fullName email')
      .populate('participants', 'fullName email')
      .sort({ startTime: 1 })
      .limit(limit * 1)
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Meeting.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        meetings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get user meetings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get meetings',
      errors: [],
    });
  }
};

// Update meeting
exports.updateMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { title, description, startTime, duration, participants } = req.body;
    const userId = req.user.id;

    const meeting = await Meeting.findOne({
      _id: meetingId,
      company: req.companyId,
      createdBy: userId
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found or you are not the creator',
        errors: [],
      });
    }

    // Update meeting fields
    if (title) meeting.title = title;
    if (description) meeting.description = description;
    if (startTime) meeting.startTime = new Date(startTime);
    if (duration) meeting.duration = duration;
    if (participants) meeting.participants = participants;

    await meeting.save();

    // Emit meeting updated event
    req.io.to(meeting.roomId).emit('meeting:updated', {
      meetingId: meeting._id,
      updates: { title, description, startTime, duration, participants },
    });

    res.status(200).json({
      success: true,
      data: meeting,
    });
  } catch (error) {
    console.error('Update meeting error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update meeting',
      errors: [],
    });
  }
};

// Cancel meeting
exports.cancelMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;

    const meeting = await Meeting.findOne({
      _id: meetingId,
      company: req.companyId,
      createdBy: userId
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found or you are not the creator',
        errors: [],
      });
    }

    meeting.status = 'cancelled';
    await meeting.save();

    // Emit meeting cancelled event
    req.io.to(meeting.roomId).emit('meeting:cancelled', {
      meetingId: meeting._id,
      title: meeting.title,
    });

    res.status(200).json({
      success: true,
      message: 'Meeting cancelled successfully',
    });
  } catch (error) {
    console.error('Cancel meeting error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel meeting',
      errors: [],
    });
  }
};

// WebRTC signaling handlers (would be implemented with Socket.io)
exports.handleSignaling = (io, socket) => {
  // Join meeting room
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
  });

  // Leave meeting room
  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
  });

  // WebRTC signaling
  socket.on('offer', (data) => {
    socket.to(data.roomId).emit('offer', {
      offer: data.offer,
      from: socket.id,
    });
  });

  socket.on('answer', (data) => {
    socket.to(data.roomId).emit('answer', {
      answer: data.answer,
      from: socket.id,
    });
  });

  socket.on('ice-candidate', (data) => {
    socket.to(data.roomId).emit('ice-candidate', {
      candidate: data.candidate,
      from: socket.id,
    });
  });

  // Screen sharing
  socket.on('start-screen-share', (data) => {
    socket.to(data.roomId).emit('screen-share-started', {
      userId: socket.id,
    });
  });

  socket.on('stop-screen-share', (data) => {
    socket.to(data.roomId).emit('screen-share-stopped', {
      userId: socket.id,
    });
  });

  // Mute/Unmute
  socket.on('mute-changed', (data) => {
    socket.to(data.roomId).emit('participant-muted', {
      userId: socket.id,
      isMuted: data.isMuted,
    });
  });

  socket.on('video-changed', (data) => {
    socket.to(data.roomId).emit('participant-video-changed', {
      userId: socket.id,
      isVideoOff: data.isVideoOff,
    });
  });
};

// ━━━ REQUEST ADMIN MEETING ━━━
exports.requestAdminMeeting = async (req, res) => {
  try {
    const { subject, date, reason } = req.body;

    // Find the company admin
    const User = require('../models/User');
    const Notification = require('../models/Notification');
    const admin = await User.findOne({ company: req.companyId, role: 'company_admin' });

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Company admin not found', errors: [] });
    }

    // Create Notification for admin
    await Notification.create({
      recipient: admin._id,
      sender: req.user._id,
      company: req.companyId,
      type: 'meeting',
      title: 'Manager Meeting Request',
      message: `${req.user.fullName} requested a meeting regarding: ${subject} on ${new Date(date).toLocaleDateString()}. Reason: ${reason}`
    });

    return res.status(200).json({ success: true, message: 'Meeting request sent to Admin' });
  } catch (error) {
    console.error('Request admin meeting error:', error);
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};
