const { studentRepository, lateRecordRepository } = require('../db/repositories/firestoreRepository');
const fineService = require('../services/fineService');

/**
 * Handle student barcode scan by staff
 * Route: POST /api/scan
 */
const scanStudent = async (req, res, next) => {
  try {
    const { studentCode } = req.body;

    // 1. Search student in Firestore by unique student_code (or barcode value)
    const student = await studentRepository.findByCode(studentCode);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student ID not found.'
      });
    }

    // 2. Validate active status
    if (student.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'This student account is inactive.'
      });
    }

    // 3. Duplicate scan protection: check if an arrival record already exists for today
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const existing = await lateRecordRepository.findDuplicateForDate(student.id, today);

    if (existing) {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_SCAN',
        message: "Today's arrival has already been recorded for this student.",
        existingRecord: {
          id: existing.id,
          arrivalTime: existing.arrival_time,
          lateMinutes: existing.late_minutes,
          fineAmount: existing.fine_amount,
          status: existing.status,
          recordedAt: existing.created_at
        },
        student: {
          id: student.id,
          studentCode: student.student_code,
          name: student.name,
          registerNumber: student.register_number,
          department: student.department,
          year: student.year
        }
      });
    }

    // 4. Fetch college settings (reporting time)
    const settings = await fineService.getCollegeSettings();
    const reportingTime = settings.reporting_time || '09:00:00';

    // 5. Backend/server time is source of truth for arrival time
    const arrivalTime = fineService.formatTimeString(now);

    // 6. Calculate late duration and fine amount based on database fine rules
    const calculation = await fineService.calculateFine(reportingTime, arrivalTime);

    // 7. Return preview response (Staff must review and click "Confirm Entry")
    res.json({
      success: true,
      message: calculation.isLate
        ? `Student identified. Arrival is late by ${calculation.lateMinutes} minute(s).`
        : 'Student arrived on time. No late fine applicable.',
      data: {
        student: {
          id: student.id,
          studentCode: student.student_code,
          name: student.name,
          registerNumber: student.register_number,
          department: student.department,
          year: student.year
        },
        reportingTime,
        arrivalTime,
        lateMinutes: calculation.lateMinutes,
        fineAmount: calculation.fineAmount,
        isLate: calculation.isLate,
        ruleId: calculation.ruleId,
        date: today
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  scanStudent
};
