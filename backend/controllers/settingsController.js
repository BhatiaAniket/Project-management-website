const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Company = require('../models/Company');
const ActivityLog = require('../models/ActivityLog');

// ━━━ GET COMPANY PROFILE (for settings) ━━━
exports.getCompanyProfile = async (req, res) => {
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

// ━━━ UPDATE COMPANY PROFILE ━━━
exports.updateCompanyProfile = async (req, res) => {
  try {
    const { name, location, industry, logo, departments } = req.body;
    const company = await Company.findByIdAndUpdate(
      req.companyId,
      { name, location, industry, logo, departments },
      { new: true, runValidators: true }
    );

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

// ━━━ CHANGE ADMIN PASSWORD ━━━
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found', errors: [] });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect', errors: [] });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ━━━ UPDATE NOTIFICATION PREFERENCES ━━━
exports.updateNotificationPreferences = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { notificationPreferences: req.body },
      { new: true }
    );

    return res.status(200).json({ success: true, data: user.notificationPreferences });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ━━━ DEACTIVATE COMPANY ━━━
exports.deactivateCompany = async (req, res) => {
  try {
    const { password } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Password is incorrect', errors: [] });
    }

    await Company.findByIdAndUpdate(req.companyId, { isActive: false });

    await ActivityLog.create({
      company: req.companyId,
      user: req.user._id,
      action: 'Deactivated company account',
      entity: 'company',
      entityId: req.companyId,
    });

    return res.status(200).json({ success: true, message: 'Company account deactivated.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};
