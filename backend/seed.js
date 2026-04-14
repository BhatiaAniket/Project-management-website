const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/User');
const connectDB = require('./config/db');

const seedSuperAdmin = async () => {
  try {
    await connectDB();

    const existingAdmin = await User.findOne({ role: 'super_admin' });
    if (existingAdmin) {
      console.log('✓ Super Admin already exists. Skipping seed.');
      process.exit(0);
    }

    const superAdmin = await User.create({
      fullName: process.env.SUPER_ADMIN_NAME || 'Super Admin',
      email: (process.env.SUPER_ADMIN_EMAIL || 'superadmin@cognifypm.com').toLowerCase(),
      password: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123',
      role: 'super_admin',
      company: null,
      isEmailVerified: true, // Pre-verified
    });

    console.log('✓ Super Admin seeded successfully:');
    console.log(`  Name:  ${superAdmin.fullName}`);
    console.log(`  Email: ${superAdmin.email}`);
    console.log(`  Role:  ${superAdmin.role}`);
    process.exit(0);
  } catch (error) {
    console.error('✗ Seed error:', error.message);
    process.exit(1);
  }
};

seedSuperAdmin();
