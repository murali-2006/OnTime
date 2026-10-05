const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

router.use(authenticate);

// Student submits payment request for staff verification
router.post('/request', authorize(['STUDENT']), paymentController.submitPaymentRequest);
router.post('/create', authorize(['STUDENT']), paymentController.submitPaymentRequest); // Compatibility

// Staff/Admin reviews and verifies payment requests
router.get('/requests', authorize(['STAFF', 'ADMIN']), paymentController.getPaymentRequests);
router.post('/:id/verify', authorize(['STAFF', 'ADMIN']), paymentController.verifyPaymentRequest);
router.post('/:id/reject', authorize(['STAFF', 'ADMIN']), paymentController.rejectPaymentRequest);

// View receipt details (only for PAID records)
router.get('/:id', authorize(['STUDENT', 'ADMIN', 'STAFF']), paymentController.getPaymentReceipt);

module.exports = router;
