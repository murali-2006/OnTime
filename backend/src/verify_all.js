const { 
  userRepository, 
  studentRepository, 
  staffRepository, 
  settingsRepository, 
  fineRulesRepository, 
  lateRecordRepository, 
  paymentRepository,
  dashboardRepository 
} = require('./db/repositories/firestoreRepository');
const fineService = require('./services/fineService');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('./config');

async function executeVerification() {
  const checks = [];
  const log = (title, passed, info) => {
    checks.push({ title, status: passed ? 'PASSED' : 'FAILED', info });
  };

  try {
    // 1. Admin login verification
    const adminUser = await userRepository.findByEmail('admin@ontime.college');
    const adminPassMatch = adminUser && await bcrypt.compare('Admin@123', adminUser.password_hash);
    log('1. Admin login verification', adminUser && adminPassMatch && adminUser.role === 'ADMIN', { email: adminUser?.email, role: adminUser?.role });

    // 2. Staff login verification
    const staffUser = await userRepository.findByEmail('staff@ontime.college');
    const staffPassMatch = staffUser && await bcrypt.compare('Staff@123', staffUser.password_hash);
    const staffProfile = staffUser ? await staffRepository.findByUserId(staffUser.id) : null;
    log('2. Staff login verification', staffUser && staffPassMatch && staffUser.role === 'STAFF' && Boolean(staffProfile), { email: staffUser?.email, staffName: staffProfile?.name });

    // 3. Student login verification
    const studentUser = await userRepository.findByEmail('stu001@ontime.college');
    const studentPassMatch = studentUser && await bcrypt.compare('Student@123', studentUser.password_hash);
    const studentProfile = studentUser ? await studentRepository.findByUserId(studentUser.id) : null;
    log('3. Student login verification', studentUser && studentPassMatch && studentUser.role === 'STUDENT' && Boolean(studentProfile), { email: studentUser?.email, studentName: studentProfile?.name });

    // 4. Student directory listing & Murali Krishna barcode
    const allStudents = await studentRepository.findAll();
    const murali = allStudents.find(s => s.barcode_data === '711224205037' || s.student_code === '711224205037' || s.register_number === '711224205037');
    log('4. Student directory & Murali Krishna barcode (711224205037)', allStudents.length >= 3 && Boolean(murali), {
      totalStudents: allStudents.length,
      muraliName: murali?.name,
      muraliCode: murali?.student_code,
      muraliRegisterNumber: murali?.register_number,
      muraliBarcode: murali?.barcode_data
    });

    // 5. Barcode scan lookup
    const lookupStudent = await studentRepository.findByCode('711224205037');
    log('5. Barcode lookup for student 711224205037', Boolean(lookupStudent), {
      id: lookupStudent?.id,
      name: lookupStudent?.name,
      department: lookupStudent?.department,
      status: lookupStudent?.status
    });

    // 6. Settings & 4 configured sessions
    const settings = await settingsRepository.getSettings();
    const sessions = settings?.sessions || [];
    const expectedSessions = [
      { name: '1st Period', time: '09:00:00', label: '9:00 AM' },
      { name: '1st Break', time: '11:00:00', label: '11:00 AM' },
      { name: 'Lunch', time: '13:15:00', label: '1:15 PM' },
      { name: '2nd Break', time: '15:00:00', label: '3:00 PM' }
    ];
    const sessionsMatch = expectedSessions.every(exp => 
      sessions.some(s => s.name === exp.name && s.time === exp.time && s.label === exp.label)
    );
    log('6. Preserved 4 session timings (9:00 AM, 11:00 AM, 1:15 PM, 3:00 PM)', sessionsMatch && sessions.length === 4, { sessions });

    // 7. Active fine rules
    const rules = await fineRulesRepository.findActive();
    log('7. Fine rules loaded from Firestore', rules.length === 5, { activeRulesCount: rules.length });

    // 8. Late minute calculation & fine calculation
    // Reporting time: 09:00:00, arrival: 09:25:00 -> 25 mins late -> fine rule 21-30 mins = ₹30.00
    const calc = await fineService.calculateFine('09:00:00', '09:25:00');
    log('8. Late minute & fine calculation logic', calc.isLate === true && calc.lateMinutes === 25 && Number(calc.fineAmount) === 30, {
      lateMinutes: calc.lateMinutes,
      fineAmount: calc.fineAmount,
      isLate: calc.isLate
    });

    // 9. Duplicate scan protection
    const dupArrival = await lateRecordRepository.findDuplicateForDate(1, '2026-09-27');
    log('9. Duplicate scan protection (detects existing arrival for date)', Boolean(dupArrival), {
      duplicateFound: Boolean(dupArrival),
      existingArrivalDate: dupArrival?.date,
      existingRecordId: dupArrival?.id
    });

    // 10. Late record history
    const lateRecords = await lateRecordRepository.findByStudentId(1);
    log('10. Student late arrival history retrieved', lateRecords.length > 0, { recordCount: lateRecords.length });

    // 11. Payments history
    const payments = await paymentRepository.findByStudentId(1);
    log('11. Student payments retrieved', payments.length > 0, { paymentCount: payments.length });

    // 12. Admin dashboard stats
    const stats = await dashboardRepository.getAdminStats();
    log('12. Admin dashboard statistics aggregation', stats.totalStudents >= 3 && stats.totalLateRecords >= 3, stats);

    // 13. Student delete operation method test
    const hasDelete = typeof studentRepository.delete === 'function';
    log('13. Student deletion capability exists in Firestore repository', hasDelete, { method: 'studentRepository.delete' });

    // 14. JWT token generation & role verification
    const token = jwt.sign({ id: adminUser.id, email: adminUser.email, role: adminUser.role }, config.jwtSecret);
    const decoded = jwt.verify(token, config.jwtSecret);
    log('14. JWT auth & Role-based claims verification', decoded.role === 'ADMIN' && decoded.email === 'admin@ontime.college', { decodedRole: decoded.role });

  } catch (err) {
    checks.push({ title: 'Unexpected Verification Error', status: 'FAILED', error: err.message, stack: err.stack });
  }

  const allPassed = checks.every(c => c.status === 'PASSED');
  return {
    success: allPassed,
    totalChecks: checks.length,
    passedChecks: checks.filter(c => c.status === 'PASSED').length,
    failedChecks: checks.filter(c => c.status === 'FAILED').length,
    checks
  };
}

module.exports = { executeVerification };

if (require.main === module) {
  executeVerification().then((res) => {
    console.log('\n--- ONTIME FIRESTORE MIGRATION VERIFICATION ---');
    res.checks.forEach((c) => {
      console.log(`[${c.status}] ${c.title}`);
    });
    console.log(`\nSummary: ${res.passedChecks}/${res.totalChecks} checks passed.\n`);
    process.exit(res.success ? 0 : 1);
  }).catch((err) => {
    console.error('Verification error:', err);
    process.exit(1);
  });
}
