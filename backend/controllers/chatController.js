const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

// ━━━ LIST CONVERSATIONS ━━━
exports.listConversations = async (req, res) => {
  try {
    // Auto-sync Company Broadcast (exclude clients)
    if (req.user.role !== 'client') {
      const nonClientUsers = await User.find({ 
        company: req.companyId, 
        role: { $ne: 'client' } 
      }).select('_id');
      const participantIds = nonClientUsers.map(u => u._id);

      if (participantIds.length > 0) {
        await Conversation.findOneAndUpdate(
          { company: req.companyId, type: 'group', groupName: 'Company Broadcast' },
          { 
            $set: { participants: participantIds },
            $setOnInsert: { company: req.companyId, type: 'group', groupName: 'Company Broadcast' }
          },
          { upsert: true, new: true }
        );
      }
    }
    const conversations = await Conversation.find({
      company: req.companyId,
      participants: req.user._id,
    })
      .populate('participants', 'fullName avatar email role')
      .populate('lastMessage.sender', 'fullName')
      .sort({ updatedAt: -1 });

    // Add unread count for each conversation
    const withUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unread = await Message.countDocuments({
          conversation: conv._id,
          readBy: { $ne: req.user._id },
          sender: { $ne: req.user._id },
        });
        return { ...conv.toObject(), unreadCount: unread };
      })
    );

    return res.status(200).json({ success: true, data: withUnread });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ━━━ CREATE CONVERSATION ━━━
exports.createConversation = async (req, res) => {
  try {
    const { type, participants, groupName } = req.body;

    // For DM, check if conversation already exists
    if (type === 'dm' && participants.length === 1) {
      const existing = await Conversation.findOne({
        company: req.companyId,
        type: 'dm',
        participants: { $all: [req.user._id, participants[0]], $size: 2 },
      }).populate('participants', 'fullName avatar email role');

      if (existing) {
        return res.status(200).json({ success: true, data: existing });
      }
    }

    const allParticipants = [req.user._id, ...participants.filter((p) => p !== req.user._id.toString())];

    const conversation = await Conversation.create({
      company: req.companyId,
      type: type || 'dm',
      participants: allParticipants,
      groupName: type === 'group' ? groupName : null,
    });

    const populated = await Conversation.findById(conversation._id).populate('participants', 'fullName avatar email role');

    return res.status(201).json({ success: true, data: populated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ━━━ GET MESSAGES ━━━
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Verify user is participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      company: req.companyId,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found', errors: [] });
    }

    const messages = await Message.find({ conversation: conversationId })
      .populate('sender', 'fullName avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Mark messages as read
    await Message.updateMany(
      { conversation: conversationId, readBy: { $ne: req.user._id }, sender: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );

    return res.status(200).json({ success: true, data: messages.reverse() });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ━━━ SEND MESSAGE ━━━
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      company: req.companyId,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found', errors: [] });
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      content: content || '',
      fileUrl: req.file ? req.file.path : null,
      fileName: req.file ? req.file.originalname : null,
      fileType: req.file ? req.file.mimetype : null,
      readBy: [req.user._id],
    });

    // Update last message
    conversation.lastMessage = {
      content: content || (req.file ? '📎 File' : ''),
      sender: req.user._id,
      timestamp: new Date(),
    };
    await conversation.save();

    const populated = await Message.findById(message._id).populate('sender', 'fullName avatar');

    return res.status(201).json({ success: true, data: populated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};
