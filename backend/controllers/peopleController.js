const { validationResult } = require('express-validator');
const User = require('../models/User');
const Project = require('../models/Project');
const Company = require('../models/Company');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const { parseFile } = require('../services/fileParser.service');
const { sendWelcomeEmail } = require('../services/email.service');
const generateTempPassword = require('../utils/generateTempPassword');
const { emitToCompany } = require('../socket');

// ━━━ LIST PEOPLE ━━━
exports.listPeople = async (req, res) => {
  try {
    const { role, department, status, search, page = 1, limit = 20 } = req.query;
    const query = { company: req.companyId, role: { $ne: 'company_admin' } };

    if (role) query.role = role;
    if (department) query.department = department;
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (req.user.role === 'manager') {
      const myProjects = await Project.find({ manager: req.user._id, company: req.companyId }).select('team');
      const teamIds = [];
      myProjects.forEach(p => {
        if (p.team) teamIds.push(...p.team);
      });
      
      // Get other managers too
      const otherManagers = await User.find({ company: req.companyId, role: 'manager' }).select('_id');
      const managerIds = otherManagers.map(m => m._id);

      query._id = { $in: [...teamIds, ...managerIds, req.user._id] };
    }

    const people = await User.find(query)
      .select('-password -refreshToken -emailVerificationToken')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: { people, total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('List people error:', error);
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ━━━ ADD SINGLE PERSON ━━━
exports.addPerson = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { fullName, email, role, department, position, contactNumber } = req.body;

    // Check if email exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already in use', errors: [] });
    }

    // Generate temp password
    const tempPassword = generateTempPassword();

    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      password: tempPassword,
      role: role || 'employee',
      company: req.companyId,
      department: department || '',
      position: position || '',
      contactNumber: contactNumber || '',
      isEmailVerified: true, // Admin-created accounts are pre-verified
      mustChangePassword: true,
    });

    // Send welcome email
    try {
      await sendWelcomeEmail({
        name: fullName,
        email: user.email,
        role: role || 'employee',
        tempPassword,
      });
    } catch (emailErr) {
      console.error('Welcome email failed:', emailErr.message);
    }

    // Update onboarding
    const company = await Company.findById(req.companyId);
    if (company) {
      if (role === 'manager' && !company.onboarding.firstManagerAdded) {
        company.onboarding.firstManagerAdded = true;
        await company.save();
      }
      if (role === 'employee' && !company.onboarding.firstEmployeeAdded) {
        company.onboarding.firstEmployeeAdded = true;
        await company.save();
      }
    }

    // Log activity
    await ActivityLog.create({
      company: req.companyId,
      user: req.user._id,
      action: `Added ${role} "${fullName}"`,
      entity: 'user',
      entityId: user._id,
    });

    // Real-time notification
    try {
      emitToCompany(req.companyId, 'notification', {
        type: 'employee_joined',
        title: 'New Team Member',
        message: `${fullName} joined as ${role}`,
      });
      emitToCompany(req.companyId, 'people:updated');
    } catch (e) { /* socket may not be initialized */ }

    return res.status(201).json({
      success: true,
      message: `${fullName} added successfully. Welcome email sent.`,
      data: { id: user._id, fullName: user.fullName, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Add person error:', error);
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ━━━ BULK IMPORT ━━━
exports.bulkImport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded', errors: [] });
    }

    const records = await parseFile(req.file);

    if (records.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid records found in file', errors: [] });
    }

    // If preview mode, just return parsed data
    if (req.query.preview === 'true') {
      return res.status(200).json({ success: true, data: { records, total: records.length } });
    }

    // Process imports
    const results = { success: [], failed: [] };

    for (const record of records) {
      try {
        if (!record.fullName || !record.email) {
          results.failed.push({ ...record, error: 'Missing name or email' });
          continue;
        }

        const existing = await User.findOne({ email: record.email.toLowerCase() });
        if (existing) {
          results.failed.push({ ...record, error: 'Email already exists' });
          continue;
        }

        const tempPassword = generateTempPassword();

        const user = await User.create({
          fullName: record.fullName,
          email: record.email.toLowerCase(),
          password: tempPassword,
          role: record.role || 'employee',
          company: req.companyId,
          department: record.department || '',
          position: record.position || '',
          contactNumber: record.contactNumber || '',
          metadata: record.metadata || {},
          isEmailVerified: true,
          mustChangePassword: true,
        });

        // Send welcome email
        try {
          await sendWelcomeEmail({
            name: record.fullName,
            email: record.email,
            role: record.role || 'employee',
            tempPassword,
          });
        } catch (emailErr) {
          console.error(`Welcome email failed for ${record.email}:`, emailErr.message);
        }

        results.success.push({ id: user._id, fullName: user.fullName, email: user.email });
      } catch (err) {
        results.failed.push({ ...record, error: err.message });
      }
    }

    // Update onboarding flags
    const company = await Company.findById(req.companyId);
    if (company) {
      const hasManager = results.success.some((r) => r.role === 'manager');
      const hasEmployee = results.success.some((r) => r.role === 'employee');
      if (hasManager) company.onboarding.firstManagerAdded = true;
      if (hasEmployee) company.onboarding.firstEmployeeAdded = true;
      await company.save();
    }

    // Log activity
    await ActivityLog.create({
      company: req.companyId,
      user: req.user._id,
      action: `Bulk imported ${results.success.length} people`,
      entity: 'user',
    });

    try {
      const { emitToCompany } = require('../socket');
      emitToCompany(req.companyId, 'people:updated');
    } catch (e) { console.error('Socket emit error:', e); }

    return res.status(200).json({
      success: true,
      message: `Imported ${results.success.length} of ${records.length} records.`,
      data: results,
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error', errors: [] });
  }
};

// ━━━ UPDATE PERSON ━━━
exports.updatePerson = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, department, position, contactNumber, role, metadata } = req.body;

    const updateData = { fullName, department, position, contactNumber, role };
    if (metadata !== undefined) updateData.metadata = metadata;

    const user = await User.findOneAndUpdate(
      { _id: id, company: req.companyId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'Person not found', errors: [] });
    }

    try {
      const { emitToCompany } = require('../socket');
      emitToCompany(req.companyId, 'people:updated');
    } catch (e) { }

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ━━━ DEACTIVATE PERSON ━━━
exports.deactivatePerson = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOneAndUpdate(
      { _id: id, company: req.companyId },
      { isActive: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'Person not found', errors: [] });
    }

    await ActivityLog.create({
      company: req.companyId,
      user: req.user._id,
      action: `Deactivated "${user.fullName}"`,
      entity: 'user',
      entityId: user._id,
    });

    try {
      const { emitToCompany } = require('../socket');
      emitToCompany(req.companyId, 'people:updated');
    } catch (e) { }

    return res.status(200).json({ success: true, message: `${user.fullName} deactivated.`, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ━━━ RESEND WELCOME EMAIL ━━━
exports.resendWelcomeEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ _id: id, company: req.companyId });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Person not found', errors: [] });
    }

    const tempPassword = generateTempPassword();
    user.password = tempPassword;
    user.mustChangePassword = true;
    await user.save();

    await sendWelcomeEmail({
      name: user.fullName,
      email: user.email,
      role: user.role,
      tempPassword,
    });

    return res.status(200).json({ success: true, message: `Welcome email resent to ${user.email}.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};

// ━━━ GET PERSON DETAIL ━━━
exports.getPersonDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ _id: id, company: req.companyId })
      .select('-password -refreshToken -emailVerificationToken');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Person not found', errors: [] });
    }

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [] });
  }
};
