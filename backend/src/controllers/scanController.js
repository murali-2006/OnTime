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

    // 3. Central session-time logic: automatically determine applicable session based on server time in Asia/Kolkata
    const now = new Date();
    const today = fineService.getIndiaTodayStr(now);
    const session = fineService.getSessionForTime(now);
    const reportingTime = session.label; // Strictly 12-hour AM/PM format (e.g. "9:00 AM", "11:00 AM", "1:15 PM", "3:00 PM")

    // 4. Duplicate scan & 4-entry-per-day protection
    const todayRecords = await lateRecordRepository.findRecordsForStudentAndDate(student.id, today);

    // Rule: Maximum 4 entries allowed per student per day (1 per session)
    if (todayRecords.length >= 4) {
      return res.status(409).json({
        success: false,
        code: 'DAILY_LIMIT_REACHED',
        message: "Maximum daily limit reached: 4 entries have already been recorded for this student today.",
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

    // Check if an arrival record already exists for the CURRENT session today
    const existing = todayRecords.find(
      (r) => r.session_name === session.name || r.reporting_time === reportingTime || r.reporting_time === session.time || r.reporting_time === session.label
    );

    if (existing) {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_SCAN',
        message: `Today's arrival for ${session.name} (${session.label}) has already been recorded for this student.`,
        existingRecord: {
          id: existing.id,
          sessionName: existing.session_name || session.name,
          arrivalTime: fineService.format12HourTime(existing.arrival_time),
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

    // 5. Backend/server time is source of truth for arrival time in India Standard Time (12-hour AM/PM)
    const arrivalTime = fineService.format12HourTime(now);

    // 6. Calculate late duration and fine amount based on database fine rules
    const calculation = await fineService.calculateFine(reportingTime, arrivalTime);

    // 7. Return preview response (Staff must review and click "Confirm Entry")
    res.json({
      success: true,
      message: calculation.isLate
        ? `Student identified for ${session.name} (${session.label}). Arrival is late by ${calculation.lateMinutes} minute(s).`
        : `Student arrived on time for ${session.name} (${session.label}). No late fine applicable.`,
      data: {
        student: {
          id: student.id,
          studentCode: student.student_code,
          name: student.name,
          registerNumber: student.register_number,
          department: student.department,
          year: student.year
        },
        sessionName: session.name,
        sessionLabel: session.label,
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
