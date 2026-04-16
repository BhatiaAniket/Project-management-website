const mongoose = require('mongoose');

/**
 * Safely converts a string or ObjectId to a Mongoose ObjectId.
 * Returns null if conversion fails (invalid id).
 */
const toObjectId = (id) => {
  try {
    if (!id) return null;
    return new mongoose.Types.ObjectId(id.toString());
  } catch (e) {
    return null;
  }
};

module.exports = toObjectId;
