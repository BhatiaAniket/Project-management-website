const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { verifyCompanyScope } = require('../middleware/verifyCompanyScope');
const projectController = require('../controllers/projectController');

router.use(protect);
router.use(verifyCompanyScope);

// Projects
router.get('/', authorize('company_admin', 'manager'), projectController.listProjects);
router.get('/:id', authorize('company_admin', 'manager'), projectController.getProject);

router.post(
  '/',
  authorize('company_admin'),
  [
    body('name').trim().notEmpty().withMessage('Project name is required'),
    body('deadline').notEmpty().withMessage('Deadline is required'),
  ],
  projectController.createProject
);

router.put('/:id', authorize('company_admin'), projectController.updateProject);
router.delete('/:id', authorize('company_admin'), projectController.deleteProject);

// Tasks across all projects
router.get('/tasks/all', authorize('company_admin', 'manager'), projectController.listAllTasks);

// Tasks within projects
router.post('/:id/tasks', authorize('company_admin', 'manager'), projectController.addTask);
router.put('/:id/tasks/:taskId', authorize('company_admin', 'manager'), projectController.updateTask);
router.delete('/:id/tasks/:taskId', authorize('company_admin', 'manager'), projectController.deleteTask);

module.exports = router;
