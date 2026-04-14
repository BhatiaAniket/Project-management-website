const mongoose = require('mongoose');

/**
 * Middleware to verify if the authenticated user owns or is assigned to the resource being accessed.
 * @param {string} modelName - The name of the Mongoose model (e.g., 'Task', 'Project')
 * @param {string} ownerField - The field in the model that stores the owner/assigned user ID (e.g., 'assignedTo', 'createdBy')
 */
const verifyOwnership = (modelName, ownerField) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      if (!resourceId) {
        return res.status(400).json({ success: false, message: 'Resource ID is required' });
      }

      const Model = mongoose.model(modelName);
      const resource = await Model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({ success: false, message: `${modelName} not found` });
      }

      // Check if user is the owner or assigned to the resource
      if (resource[ownerField].toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: You do not have permission to modify this ${modelName.toLowerCase()}`
        });
      }

      // Attach resource to request for potential use in controller
      req.resource = resource;
      next();
    } catch (error) {
      console.error(`VerifyOwnership Error (${modelName}):`, error.message);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during ownership verification'
      });
    }
  };
};

module.exports = verifyOwnership;
