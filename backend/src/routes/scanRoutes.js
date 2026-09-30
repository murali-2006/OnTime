const express = require('express');
const router = express.Router();
const scanController = require('../controllers/scanController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const { validateScan } = require('../validators/scanValidator');

router.use(authenticate);

// Barcode scan endpoint (Staff and Admin)
router.post('/', authorize(['STAFF', 'ADMIN']), validateScan, scanController.scanStudent);

module.exports = router;
