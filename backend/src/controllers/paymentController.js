const {
  lateRecordRepository,
  paymentRepository,
  studentRepository
} = require('../db/repositories/firestoreRepository');
const { format12HourTime, getIndiaTodayStr } = require('../utils/indiaTime');

/**
 * Student submits a fine payment request after scanning dummy QR code
 * Route: POST /api/payments/request (also supports POST /api/payments/create)
 */
const submitPaymentRequest = async (req, res, next) => {
  try {
    const { lateRecordId } = req.body;
    const studentProfile = req.user.studentProfile;

    if (!studentProfile) {
      return res.status(403).json({
        success: false,
        message: 'Only registered students can submit fine payment requests.'
      });
    }

    if (!lateRecordId) {
      return res.status(400).json({
        success: false,
        message: 'Late record ID is required.'
      });
    }

    // Verify fine record exists in Firestore
    const record = await lateRecordRepository.findById(lateRecordId);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Late fine record not found.'
      });
    }

    // Must belong to the authenticated student
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
        message: 'This fine has already been verified and marked as PAID.'
      });
    }

    if (parseFloat(record.fine_amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No fine amount is payable for this record.'
      });
    }

    // DUPLICATE PROTECTION: Check if an active PENDING request already exists for this fine
    const existingPending = await paymentRepository.findPendingByLateRecordId(record.id);
    if (existingPending) {
      return res.status(409).json({
        success: false,
        message: 'Payment request is already pending staff verification.',
        isPending: true,
        payment: existingPending
      });
    }

    const now = new Date().toISOString();
    const fineAmount = parseFloat(record.fine_amount).toFixed(2);

    // SECURITY: Status is STRICTLY set to 'PENDING'. Student cannot directly set 'PAID'.
    const payment = await paymentRepository.create({
      lateRecordId: Number(record.id),
      studentId: Number(studentProfile.id),
      studentName: studentProfile.name,
      studentCode: studentProfile.student_code,
      registerNumber: studentProfile.register_number,
      department: studentProfile.department,
      amount: fineAmount,
      fineAmount: fineAmount,
      payment_gateway: 'DEMO_QR',
      status: 'PENDING',
      submittedAt: now,
      transaction_id: `DEMO_${Date.now()}`
    });

    res.json({
      success: true,
      message: 'Payment request sent to staff for verification.',
      status: 'PENDING',
      payment: {
        id: payment.id,
        paymentId: payment.id,
        studentId: payment.student_id,
        studentName: payment.student_name,
        studentCode: payment.student_code,
        lateRecordId: payment.late_record_id,
        fineAmount: payment.amount,
        status: 'PENDING',
        submittedAt: payment.submittedAt || now
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all payment verification requests (Staff & Admin)
 * Route: GET /api/payments/requests
 */
const getPaymentRequests = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const requests = await paymentRepository.findAllRequests({ status, search });

    res.json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Staff accepts and verifies a payment request
 * Route: POST /api/payments/:id/verify
 */
const verifyPaymentRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const staffUser = req.user;

    // Authorization check: Staff or Admin only
    if (staffUser.role !== 'STAFF' && staffUser.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only college staff or administrators can verify payment requests.'
      });
    }

    const payment = await paymentRepository.findById(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment request not found.'
      });
    }

    if (payment.status === 'PAID') {
      return res.status(400).json({
        success: false,
        message: 'This payment request has already been verified and marked as PAID.'
      });
    }

    const now = new Date().toISOString();
    const staffName = staffUser.profile?.name || staffUser.email || 'Gate Attendance Officer';

    // 1. Update Payment Record to PAID
    const updatedPayment = await paymentRepository.update(payment.id, {
      status: 'PAID',
      verifiedAt: now,
      verifiedBy: staffName,
      paid_at: now
    });

    // 2. Update Late Record to PAID
    await lateRecordRepository.update(payment.late_record_id || payment.lateRecordId, {
      status: 'PAID',
      updated_at: now
    });

    res.json({
      success: true,
      message: `Payment of ₹${payment.amount || payment.fineAmount} for ${payment.student_name || payment.studentName} verified and confirmed!`,
      status: 'PAID',
      payment: updatedPayment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Staff rejects a payment request
 * Route: POST /api/payments/:id/reject
 */
const rejectPaymentRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const staffUser = req.user;

    // Authorization check: Staff or Admin only
    if (staffUser.role !== 'STAFF' && staffUser.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only college staff or administrators can reject payment requests.'
      });
    }

    const payment = await paymentRepository.findById(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment request not found.'
      });
    }

    if (payment.status === 'PAID') {
      return res.status(400).json({
        success: false,
        message: 'Cannot reject an already verified and paid fine.'
      });
    }

    const now = new Date().toISOString();
    const staffName = staffUser.profile?.name || staffUser.email || 'Gate Attendance Officer';
    const rejectionReason = (reason && reason.trim()) || 'Payment verification rejected by staff.';

    // Update payment record to REJECTED
    const updatedPayment = await paymentRepository.update(payment.id, {
      status: 'REJECTED',
      verifiedAt: now,
      verifiedBy: staffName,
      rejectionReason
    });

    // Ensure late record remains PENDING
    await lateRecordRepository.update(payment.late_record_id || payment.lateRecordId, {
      status: 'PENDING',
      updated_at: now
    });

    res.json({
      success: true,
      message: 'Payment request rejected.',
      status: 'REJECTED',
      payment: updatedPayment
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
        message: 'Payment receipt not found or not yet verified as PAID.'
      });
    }

    // Receipt must become available ONLY after status === PAID
    if (receipt.payment_status !== 'PAID' && receipt.payment_status !== 'SUCCESS') {
      return res.status(400).json({
        success: false,
        message: 'Receipt is available only after payment has been verified and marked as PAID.'
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
  submitPaymentRequest,
  createPaymentOrder: submitPaymentRequest, // Compatibility alias
  getPaymentRequests,
  verifyPaymentRequest,
  rejectPaymentRequest,
  getPaymentReceipt
};
