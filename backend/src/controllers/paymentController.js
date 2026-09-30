const {
  lateRecordRepository,
  paymentRepository
} = require('../db/repositories/firestoreRepository');
const paymentService = require('../services/paymentService');

/**
 * Initiate a payment order for a pending late fine
 * Route: POST /api/payments/create
 */
const createPaymentOrder = async (req, res, next) => {
  try {
    const { lateRecordId } = req.body;
    const studentProfile = req.user.studentProfile;

    if (!studentProfile) {
      return res.status(403).json({
        success: false,
        message: 'Only registered students can initiate fine payments.'
      });
    }

    if (!lateRecordId) {
      return res.status(400).json({
        success: false,
        message: 'Late record ID is required.'
      });
    }

    // Verify record exists and belongs to this student
    const record = await lateRecordRepository.findById(lateRecordId);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Late fine record not found.'
      });
    }

    // Must belong to this student
    if (Number(record.student_id) !== Number(studentProfile.id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot pay fines for another student.'
      });
    }

    // Paid fines cannot be paid again
    if (record.status === 'PAID') {
      return res.status(400).json({
        success: false,
        message: 'This fine has already been paid.'
      });
    }

    if (parseFloat(record.fine_amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No fine amount is payable for this record.'
      });
    }

    const fineAmount = parseFloat(record.fine_amount);

    // Call payment service to create gateway order
    const order = await paymentService.createOrder(record.id, studentProfile.id, fineAmount);

    // Record the initiated payment in payments collection
    await paymentRepository.create({
      late_record_id: record.id,
      student_id: studentProfile.id,
      amount: fineAmount,
      payment_gateway: 'RAZORPAY',
      gateway_order_id: order.orderId,
      status: 'CREATED'
    });

    // If in test mode, return demo credentials for test sandbox checkout
    let testCredentials = null;
    if (order.mode === 'test') {
      const mockPaymentId = `pay_mock_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
      const testSig = paymentService.generateTestSignature(order.orderId, mockPaymentId);
      testCredentials = {
        mockPaymentId,
        testSignature: testSig
      };
    }

    res.json({
      success: true,
      message: 'Payment order created.',
      order: {
        ...order,
        studentName: studentProfile.name,
        studentCode: studentProfile.student_code,
        studentEmail: req.user.email,
        testCredentials
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify payment signature from gateway and update fine status to PAID
 * Route: POST /api/payments/verify
 */
const verifyPayment = async (req, res, next) => {
  const { lateRecordId, orderId, paymentId, signature } = req.body;
  const studentProfile = req.user.studentProfile;

  if (!lateRecordId || !orderId || !paymentId || !signature) {
    return res.status(400).json({
      success: false,
      message: 'Payment verification failed: Missing required verification parameters.'
    });
  }

  // 1. Backend verifies cryptographic signature
  const isValid = paymentService.verifyPaymentSignature({
    orderId,
    paymentId,
    signature
  });

  if (!isValid) {
    // Record failure in payments collection
    const existingPayment = await paymentRepository.findByOrderId(orderId);
    if (existingPayment) {
      await paymentRepository.update(existingPayment.id, { status: 'FAILED' });
    }

    return res.status(400).json({
      success: false,
      message: 'Payment signature verification failed. Fine remains unpaid.'
    });
  }

  // 2. Perform database updates in Firestore
  try {
    const fineRecord = await lateRecordRepository.findById(lateRecordId);

    if (!fineRecord) {
      return res.status(404).json({ success: false, message: 'Late record not found.' });
    }

    // Authorization check
    if (studentProfile && Number(fineRecord.student_id) !== Number(studentProfile.id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized payment attempt.' });
    }

    if (fineRecord.status === 'PAID') {
      return res.status(400).json({ success: false, message: 'This fine has already been marked as PAID.' });
    }

    const now = new Date().toISOString();

    // Update payment record to SUCCESS
    const existingPayment = await paymentRepository.findByOrderId(orderId);
    let savedPayment;

    if (existingPayment) {
      savedPayment = await paymentRepository.update(existingPayment.id, {
        transaction_id: paymentId,
        gateway_signature: signature,
        status: 'SUCCESS',
        paid_at: now
      });
    } else {
      savedPayment = await paymentRepository.create({
        late_record_id: Number(lateRecordId),
        student_id: Number(fineRecord.student_id),
        amount: fineRecord.fine_amount,
        payment_gateway: 'RAZORPAY',
        transaction_id: paymentId,
        gateway_order_id: orderId,
        gateway_signature: signature,
        status: 'SUCCESS',
        paid_at: now
      });
    }

    // Update late_record status to PAID
    await lateRecordRepository.update(lateRecordId, {
      status: 'PAID'
    });

    res.json({
      success: true,
      message: 'Payment verified and confirmed successfully!',
      paymentId: savedPayment.id,
      transactionId: paymentId,
      paidAt: savedPayment.paid_at || now,
      status: 'PAID'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get payment receipt details
 * Route: GET /api/payments/:id
 */
const getPaymentReceipt = async (req, res, next) => {
  try {
    const { id } = req.params;
    const receipt = await paymentRepository.getReceiptDetails(id);

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Payment receipt not found.'
      });
    }

    // Authorization check: Student can only view their own receipts
    if (req.user.role === 'STUDENT') {
      if (!req.user.studentProfile || Number(req.user.studentProfile.id) !== Number(receipt.student_id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not authorized to view this receipt.'
        });
      }
    }

    res.json({
      success: true,
      receipt
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  getPaymentReceipt
};
