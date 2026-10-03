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

    const pendingFines = records.filter((r) => r.status === 'PENDING' && parseFloat(r.fine_amount || 0) > 0);
    const paidFines = records.filter((r) => r.status === 'PAID');

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
