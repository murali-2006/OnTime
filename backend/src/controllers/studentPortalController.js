const {
  studentRepository,
  userRepository,
  lateRecordRepository,
  paymentRepository
} = require('../db/repositories/firestoreRepository');
const { getIndiaTodayStr } = require('../utils/indiaTime');

/**
 * Get logged-in student's complete profile
 * Route: GET /api/student/profile
 */
const getProfile = async (req, res, next) => {
  try {
    const studentProfile = req.user.studentProfile;
    if (!studentProfile) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not linked to this user account.'
      });
    }

    const student = await studentRepository.findById(studentProfile.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const user = student.user_id ? await userRepository.findById(student.user_id) : null;

    // Student late records statistics
    const allRecordsResult = await lateRecordRepository.findAll({ studentId: studentProfile.id, limit: 1000 });
    const records = allRecordsResult.records;

    const totalLateCount = records.length;
    const pendingRecords = records.filter((r) => r.status === 'PENDING');
    const pendingFinesCount = pendingRecords.length;
    const pendingFinesSum = pendingRecords.reduce((sum, r) => sum + parseFloat(r.fine_amount || 0), 0);
    const paidRecords = records.filter((r) => r.status === 'PAID');
    const paidFinesSum = paidRecords.reduce((sum, r) => sum + parseFloat(r.fine_amount || 0), 0);

    // Today's arrival record if any in Asia/Kolkata
    const today = getIndiaTodayStr();
    const todayRecord = await lateRecordRepository.findDuplicateForDate(studentProfile.id, today);

    res.json({
      success: true,
      student: {
        ...student,
        account_email: user ? user.email : student.email
      },
      stats: {
        totalLateCount,
        pendingFinesCount,
        pendingFinesSum,
        paidFinesSum
      },
      todayRecord: todayRecord || null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get student's late records history
 * Route: GET /api/student/late-records
 */
const getStudentLateRecords = async (req, res, next) => {
  try {
    const studentProfile = req.user.studentProfile;
    if (!studentProfile) {
      return res.json({ success: true, records: [] });
    }

    const result = await lateRecordRepository.findAll({ studentId: studentProfile.id, limit: 1000 });

    res.json({
      success: true,
      count: result.records.length,
      records: result.records
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get student's pending and paid fines
 * Route: GET /api/student/fines
 */
const getStudentFines = async (req, res, next) => {
  try {
    const studentProfile = req.user.studentProfile;
    if (!studentProfile) {
      return res.json({ success: true, pendingFines: [], paidFines: [] });
    }

    const result = await lateRecordRepository.findAll({ studentId: studentProfile.id, limit: 1000 });
    const records = result.records;

    // Fetch all payment requests and records for this student
    const studentPayments = await paymentRepository.findAllByStudentId(studentProfile.id);

    const pendingFines = records
      .filter((r) => r.status === 'PENDING' && parseFloat(r.fine_amount || 0) > 0)
      .map((fine) => {
        // Find latest payment request for this fine record
        const matching = studentPayments.filter(
          (p) => Number(p.late_record_id || p.lateRecordId) === Number(fine.id)
        );
        const latest = matching[0] || null;

        return {
          ...fine,
          paymentRequest: latest
            ? {
                id: latest.id,
                paymentId: latest.paymentId || latest.id,
                status: latest.status,
                submittedAt: latest.submittedAt || latest.created_at,
                verifiedAt: latest.verifiedAt,
                verifiedBy: latest.verifiedBy,
                rejectionReason: latest.rejectionReason
              }
            : null
        };
      });

    const paidFines = records
      .filter((r) => r.status === 'PAID')
      .map((fine) => {
        const paidPayment = studentPayments.find(
          (p) =>
            Number(p.late_record_id || p.lateRecordId) === Number(fine.id) &&
            (p.status === 'PAID' || p.status === 'SUCCESS')
        );

        return {
          ...fine,
          payment_id: paidPayment ? paidPayment.id : fine.id,
          paid_at: paidPayment ? (paidPayment.paid_at || paidPayment.verifiedAt) : fine.updated_at,
          verifiedBy: paidPayment ? paidPayment.verifiedBy : null
        };
      });

    res.json({
      success: true,
      pendingFines,
      paidFines
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  getStudentLateRecords,
  getStudentFines
};
