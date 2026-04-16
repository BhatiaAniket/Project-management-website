/**
 * Migration: Add reassignmentCount field to all existing Tasks that don't have it.
 * Run once: node scripts/migrate_reassignmentCount.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Task = require('../models/Task');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const result = await Task.updateMany(
      { reassignmentCount: { $exists: false } },
      { $set: { reassignmentCount: 0 } }
    );

    console.log(`Migration complete: updated ${result.modifiedCount} tasks with reassignmentCount: 0`);
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
    process.exit(0);
  }
};

run();
