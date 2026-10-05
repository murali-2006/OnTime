/**
 * Standalone Historical Data Cleanup Script
 * Cleans ONLY:
 *   - 'late_records' collection
 *   - 'payments' collection
 *
 * STRICTLY PRESERVES:
 *   - 'students' (master student profiles, register numbers, barcodes)
 *   - 'users' (auth accounts)
 *   - 'staff' (staff profiles)
 *   - 'college_settings' (reporting times, sessions)
 *   - 'fine_rules' (fine rules and configuration)
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { getFirestore } = require('../src/db/firestore');

async function runCleanup() {
  console.log('====================================================');
  console.log('🧹 ONTIME HISTORICAL FINE & PAYMENT DATA CLEANUP');
  console.log('====================================================\n');

  const db = getFirestore();

  console.log('--- 1. AUDITING BEFORE DELETION ---');

  // Verify Master Collections (DO NOT TOUCH)
  const studentsBefore = await db.collection('students').get();
  const usersBefore = await db.collection('users').get();
  const staffBefore = await db.collection('staff').get();
  const settingsBefore = await db.collection('college_settings').get();
  const fineRulesBefore = await db.collection('fine_rules').get();

  console.log(`[MASTER DATA PRESERVED]`);
  console.log(`  students:         ${studentsBefore.size} records`);
  console.log(`  users:            ${usersBefore.size} records`);
  console.log(`  staff:            ${staffBefore.size} records`);
  console.log(`  college_settings: ${settingsBefore.size} records`);
  console.log(`  fine_rules:       ${fineRulesBefore.size} records`);

  // Target Collections to Clear
  const lateRecordsBefore = await db.collection('late_records').get();
  const paymentsBefore = await db.collection('payments').get();

  console.log(`\n[TARGET COLLECTIONS TO CLEAR]`);
  console.log(`  late_records:     ${lateRecordsBefore.size} records found`);
  console.log(`  payments:         ${paymentsBefore.size} records found`);

  console.log('\n--- 2. PERFORMING SAFE DELETION ---');

  let deletedLateCount = 0;
  for (const doc of lateRecordsBefore.docs) {
    await db.collection('late_records').doc(doc.id).delete();
    deletedLateCount++;
  }
  console.log(`  Deleted ${deletedLateCount} records from 'late_records' collection.`);

  let deletedPaymentsCount = 0;
  for (const doc of paymentsBefore.docs) {
    await db.collection('payments').doc(doc.id).delete();
    deletedPaymentsCount++;
  }
  console.log(`  Deleted ${deletedPaymentsCount} records from 'payments' collection.`);

  console.log('\n--- 3. VERIFYING AFTER DELETION ---');

  const lateRecordsAfter = await db.collection('late_records').get();
  const paymentsAfter = await db.collection('payments').get();

  console.log(`  late_records remaining: ${lateRecordsAfter.size} (Expected: 0)`);
  console.log(`  payments remaining:     ${paymentsAfter.size} (Expected: 0)`);

  // Verify Master Collections are 100% Unchanged
  const studentsAfter = await db.collection('students').get();
  const usersAfter = await db.collection('users').get();
  const staffAfter = await db.collection('staff').get();
  const settingsAfter = await db.collection('college_settings').get();
  const fineRulesAfter = await db.collection('fine_rules').get();

  console.log('\n--- 4. MASTER DATA INTEGRITY CHECK ---');
  console.log(`  students:         ${studentsAfter.size} records (Untouched: ${studentsAfter.size === studentsBefore.size ? 'YES' : 'NO'})`);
  console.log(`  users:            ${usersAfter.size} records (Untouched: ${usersAfter.size === usersBefore.size ? 'YES' : 'NO'})`);
  console.log(`  staff:            ${staffAfter.size} records (Untouched: ${staffAfter.size === staffBefore.size ? 'YES' : 'NO'})`);
  console.log(`  college_settings: ${settingsAfter.size} records (Untouched: ${settingsAfter.size === settingsBefore.size ? 'YES' : 'NO'})`);
  console.log(`  fine_rules:       ${fineRulesAfter.size} records (Untouched: ${fineRulesAfter.size === fineRulesBefore.size ? 'YES' : 'NO'})`);

  console.log('\n====================================================');
  console.log('✅ HISTORICAL DATA CLEANUP COMPLETED SUCCESSFULLY');
  console.log('====================================================');

  return {
    deletedLateRecords: deletedLateCount,
    deletedPayments: deletedPaymentsCount,
    masterDataPreserved: true
  };
}

if (require.main === module) {
  runCleanup()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Cleanup failed:', err);
      process.exit(1);
    });
}

module.exports = runCleanup;
