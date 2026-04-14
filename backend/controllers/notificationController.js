const Notification = require('../models/Notification');
const User = require('../models/User');

// ━━━ LIST NOTIFICATIONS ━━━
exports.listNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const query = { user: req.user._id, company: req.companyId };
    if (unreadOnly === 'true') query.isRead = false;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ user: req.user._id, company: req.companyId, isRead: false });

    return res.status(200).json({
      success: true,
      data: { notifications, total, unreadCount, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ━━━ MARK AS READ ━━━
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, company: req.companyId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found', errors: [] });
    }

    return res.status(200).json({ success: true, data: notification });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ━━━ MARK ALL AS READ ━━━
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, company: req.companyId, isRead: false },
      { isRead: true }
    );

    return res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ━━━ DELETE NOTIFICATION ━━━
exports.deleteNotification = async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id, company: req.companyId });
    return res.status(200).json({ success: true, message: 'Notification deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ━━━ GET UNREAD COUNT (for navbar bell) ━━━
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user._id,
      company: req.companyId,
      isRead: false,
    });
    return res.status(200).json({ success: true, data: { count } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ━━━ BROADCAST NOTIFICATION (Company Admin) ━━━
exports.broadcastNotification = async (req, res) => {
  try {
    // Only company_admin should broadcast globally
    if (req.user.role !== 'company_admin') {
      return res.status(403).json({ success: false, message: 'Only admins can broadcast notifications' });
    }

    const { title, message } = req.body;
    
    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    // Get all users in the company
    const users = await User.find({ company: req.companyId }).select('_id');

    // Build the bulk array
    const mongoose = require('mongoose');
    const broadcastId = new mongoose.Types.ObjectId();
    const notificationsToInsert = users.map(u => ({
      company: req.companyId,
      user: u._id,
      type: 'announcement',
      title,
      message: message || '',
      isRead: false,
      relatedId: broadcastId
    }));

    if (notificationsToInsert.length > 0) {
      await Notification.insertMany(notificationsToInsert);
    }

    // Emit event if socket is connected (Optional/Bonus)
    if (req.io) {
      req.io.to(req.companyId.toString()).emit('notification:broadcast', {
        title,
        message,
        type: 'announcement'
      });
    }

    return res.status(201).json({ success: true, message: 'Broadcast sent successfully!' });
  } catch (error) {
    console.error('Broadcast error:', error);
    return res.status(500).json({ success: false, message: 'Failed to broadcast notification', errors: [] });
  }
};

// ━━━ RECALL/DELETE BROADCAST GLOBALLY ━━━
exports.deleteBroadcast = async (req, res) => {
  try {
    if (req.user.role !== 'company_admin') {
      return res.status(403).json({ success: false, message: 'Only admins can delete broadcasts' });
    }
    await Notification.deleteMany({ relatedId: req.params.id, company: req.companyId });
    return res.status(200).json({ success: true, message: 'Broadcast recalled successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};
