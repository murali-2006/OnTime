const express = require('express');
const router = express.Router();
const studentPortalController = require('../controllers/studentPortalController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

router.use(authenticate, authorize(['STUDENT']));

router.get('/profile', studentPortalController.getProfile);
router.get('/late-records', studentPortalController.getStudentLateRecords);
router.get('/fines', studentPortalController.getStudentFines);

module.exports = router;
