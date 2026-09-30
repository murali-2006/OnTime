const {
  studentRepository,
  lateRecordRepository
} = require('../db/repositories/firestoreRepository');
const fineService = require('../services/fineService');

/**
 * Confirm and save late entry record
 * Route: POST /api/late-records
 */
const confirmLateRecord = async (req, res, next) => {
  try {
    const { studentId } = req.body;
    const staffId = req.user.staffProfile ? req.user.staffProfile.id : null;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required.'
      });
    }

    // Verify student exists and is ACTIVE
    const student = await studentRepository.findById(studentId);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.'
      });
    }

    if (student.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Cannot record entry: Student account is inactive.'
      });
    }

    // Check duplicate arrival record for today (database safeguard)
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const dup = await lateRecordRepository.findDuplicateForDate(studentId, today);

    if (dup) {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_ENTRY',
        message: "Today's arrival has already been recorded for this student."
      });
    }

    // Server-side calculation: source of truth
    const settings = await fineService.getCollegeSettings();
    const reportingTime = settings.reporting_time || '09:00:00';
    const arrivalTime = fineService.formatTimeString(now);

    const calculation = await fineService.calculateFine(reportingTime, arrivalTime);

    // Initial status:
    // If student arrived on time or late minutes is 0, status is WAIVED / ON_TIME (no fine required)
    // If fine > 0, status is PENDING
    const recordStatus = calculation.lateMinutes > 0 && calculation.fineAmount > 0 ? 'PENDING' : 'WAIVED';

    const savedRecord = await lateRecordRepository.create({
      student_id: student.id,
      staff_id: staffId,
      date: today,
      reporting_time: reportingTime,
      arrival_time: arrivalTime,
      late_minutes: calculation.lateMinutes,
      fine_amount: calculation.fineAmount,
      status: recordStatus
    });

    res.status(201).json({
      success: true,
      message: recordStatus === 'PENDING'
        ? `Late entry recorded successfully. Fine of ₹${calculation.fineAmount} registered.`
        : 'Arrival recorded successfully. Student is on time; no fine applied.',
      record: {
        ...savedRecord,
        student: {
          id: student.id,
          name: student.name,
          studentCode: student.student_code,
          registerNumber: student.register_number
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all late records with filtering and pagination
 * Route: GET /api/late-records
 */
const getAllLateRecords = async (req, res, next) => {
  try {
    const { date, status, studentId, search, limit = 50, offset = 0 } = req.query;

    let targetStudentId = studentId;
    // Role-based scoping: If student, force filter by student's own ID
    if (req.user.role === 'STUDENT') {
      if (!req.user.studentProfile) {
        return res.json({ success: true, records: [], total: 0 });
      }
      targetStudentId = req.user.studentProfile.id;
    }

    const result = await lateRecordRepository.findAll({
      date,
      status,
      studentId: targetStudentId,
      search,
      limit,
      offset
    });

    res.json({
      success: true,
      count: result.records.length,
      total: result.count,
      records: result.records
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single late record details
 * Route: GET /api/late-records/:id
 */
const getLateRecordById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const record = await lateRecordRepository.findById(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Late record not found.'
      });
    }

    // Authorization check: student can only view their own record
    if (req.user.role === 'STUDENT') {
      if (!req.user.studentProfile || req.user.studentProfile.id !== record.student_id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not authorized to view this record.'
        });
      }
    }

    res.json({
      success: true,
      record
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  confirmLateRecord,
  getAllLateRecords,
  getLateRecordById
};
