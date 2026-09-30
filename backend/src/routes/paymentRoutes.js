const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

router.use(authenticate);

// Student creates payment order
router.post('/create', authorize(['STUDENT']), paymentController.createPaymentOrder);

// Student verifies payment with gateway signature
router.post('/verify', authorize(['STUDENT']), paymentController.verifyPayment);

// View receipt details
router.get('/:id', authorize(['STUDENT', 'ADMIN', 'STAFF']), paymentController.getPaymentReceipt);

module.exports = router;
