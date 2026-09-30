const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const { validateFineRule } = require('../validators/fineRuleValidator');

// Protect all admin routes
router.use(authenticate, authorize(['ADMIN']));

// Dashboard overview metrics
router.get('/dashboard', adminController.getDashboardStats);

// Settings
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

// Fine rules management
router.get('/fine-rules', adminController.getFineRules);
router.post('/fine-rules', validateFineRule, adminController.createFineRule);
router.put('/fine-rules/:id', validateFineRule, adminController.updateFineRule);
router.patch('/fine-rules/:id/status', adminController.toggleFineRuleStatus);

// Payment audit logs
router.get('/payments', adminController.getAllPayments);

module.exports = router;
