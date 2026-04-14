/**
 * cleanManagerEmployee.js
 * Run once to clean up manager/employee-specific data from MongoDB.
 *
 * Usage:
 *   cd backend
 *   node scripts/cleanManagerEmployee.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function clean() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;

  // Drop manager/employee specific collections if they exist
  const collections = await db.listCollections().toArray();
  const names = collections.map((c) => c.name);

  const toDrop = ['worklogs', 'performancescores', 'githubtokens'];
  for (const col of toDrop) {
    if (names.includes(col)) {
      await db.dropCollection(col);
      console.log(`✅ Dropped: ${col}`);
    } else {
      console.log(`ℹ️  Skipped (not found): ${col}`);
    }
  }

  // Remove manager/employee specific fields from all users
  const User = require('../models/User');
  const userResult = await User.updateMany(
    {},
    {
      $unset: {
        githubAccessToken: '',
        githubUsername: '',
        githubConnected: '',
        productivityScore: '',
        lastAIInsightAt: '',
        workingDays: '',
        reportsTo: '',
      },
    }
  );
  console.log(`✅ Cleaned deprecated fields from ${userResult.modifiedCount} user(s)`);

  // Remove task fields that were employee-specific
  const Task = require('../models/Task');
  const taskResult = await Task.updateMany(
    {},
    { $unset: { workLogs: '', linkedRepo: '' } }
  );
  console.log(`✅ Cleaned deprecated task fields from ${taskResult.modifiedCount} task(s)`);

  console.log('🎉 Cleanup complete!');
  await mongoose.disconnect();
}

clean().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
