const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Company = require('../models/Company');
const sendEmail = require('../utils/sendEmail');
const { getVerificationEmailTemplate } = require('../utils/emailTemplates');

// Generate access token
const generateAccessToken = (user) => {
  return jwt.sign(
    { userId: user._id, role: user.role, companyId: user.company },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
};

// Generate refresh token
const generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES || '7d' }
  );
};

// ━━━ REGISTER (Company Admin only) ━━━
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const {
      companyName,
      companyLocation,
      employeeCount,
      companyIndustry,
      fullName,
      email,
      password,
    } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
        errors: [{ field: 'email', message: 'Email already in use' }],
      });
    }

    // Create Company (inactive until email verified)
    const company = await Company.create({
      name: companyName,
      location: companyLocation,
      employeeCount: employeeCount || '1-10',
      industry: companyIndustry || '',
      isActive: false,
    });

    // Generate email verification token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    // Create User
    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      password,
      role: 'company_admin',
      company: company._id,
      isEmailVerified: false,
      emailVerificationToken: hashedToken,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${rawToken}`;
    const emailHtml = getVerificationEmailTemplate(fullName, verificationUrl);

    try {
      await sendEmail({
        to: user.email,
        subject: 'Verify your CognifyPM account',
        html: emailHtml,
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError.message);
      // Don't fail registration if email fails - user can resend
    }

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Verification email sent.',
      data: { email: user.email },
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
      errors: [],
    });
  }
};

// ━━━ LOGIN (All roles) ━━━
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const { email, password } = req.body;

    // Find user by email, include password field
    const user = await User.findOne({
      email: email.toLowerCase()
    }).select('+password +refreshToken');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        errors: [],
      });
    }

    // Check if email is verified
    // Skip check for admin-created roles (they don't self-register)
    const skipVerificationRoles = ['super_admin', 'manager', 'employee'];
    if (!user.isEmailVerified && !skipVerificationRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email first. Check your inbox for the verification link.',
        errors: [],
      });
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        errors: [],
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token in DB
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        accessToken,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          company: user.company,
          mustChangePassword: user.mustChangePassword || false,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
      errors: [],
    });
  }
};

// ━━━ VERIFY EMAIL ━━━
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required.',
        errors: [],
      });
    }

    // Hash the incoming token to compare with stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification link.',
        errors: [],
      });
    }

    // Activate user and company
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    // Activate the company
    if (user.company) {
      await Company.findByIdAndUpdate(user.company, { isActive: true });
    }

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully. Your account is now active.',
      data: {},
    });
  } catch (error) {
    console.error('Verify email error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
      errors: [],
    });
  }
};

// ━━━ RESEND VERIFICATION EMAIL ━━━
exports.resendVerification = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't reveal if email exists
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a verification link has been sent.',
        data: {},
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified.',
        errors: [],
      });
    }

    // Generate new token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${rawToken}`;
    const emailHtml = getVerificationEmailTemplate(user.fullName, verificationUrl);

    await sendEmail({
      to: user.email,
      subject: 'Verify your CognifyPM account',
      html: emailHtml,
    });

    return res.status(200).json({
      success: true,
      message: 'Verification email sent successfully.',
      data: {},
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
      errors: [],
    });
  }
};

// ━━━ LOGOUT ━━━
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (refreshToken) {
      // Clear refresh token from DB
      await User.findOneAndUpdate(
        { refreshToken },
        { refreshToken: null },
        { new: true }
      );
    }

    // Clear cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
      data: {},
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
      errors: [],
    });
  }
};

// ━━━ REFRESH TOKEN ━━━
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'No refresh token provided.',
        errors: [],
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token.',
        errors: [],
      });
    }

    // Find user with this refresh token
    const user = await User.findOne({
      _id: decoded.userId,
      refreshToken,
    }).select('+refreshToken');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token.',
        errors: [],
      });
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Update refresh token in DB
    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    // Set new refresh token cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully.',
      data: { accessToken: newAccessToken },
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
      errors: [],
    });
  }
};

// ━━━ CHANGE PASSWORD (first login forced change) ━━━
exports.changePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
        errors: [],
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
        errors: [],
      });
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
      data: {},
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
      errors: [],
    });
  }
};
