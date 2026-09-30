const express = require('express');
const router = express.Router();
const lateRecordController = require('../controllers/lateRecordController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

router.use(authenticate);

// Confirm and save late entry (Staff and Admin)
router.post('/', authorize(['STAFF', 'ADMIN']), lateRecordController.confirmLateRecord);

// Get all late records (Admin, Staff, Student)
router.get('/', authorize(['ADMIN', 'STAFF', 'STUDENT']), lateRecordController.getAllLateRecords);

// Get specific late record (Admin, Staff, Student)
router.get('/:id', authorize(['ADMIN', 'STAFF', 'STUDENT']), lateRecordController.getLateRecordById);

module.exports = router;
