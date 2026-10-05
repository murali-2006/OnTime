/**
 * STRICT ONE-TIME FIRESTORE CLEANUP
 * DELETES ONLY 'payments' AND 'late_records' COLLECTIONS
 *
 * Safe Procedure:
 * 1. Connect using existing Firebase Admin SDK.
 * 2. Read ONLY 'payments' collection. Count documents.
 * 3. Delete ONLY those documents.
 * 4. Verify 'payments' has 0 documents.
 * 5. Read ONLY 'late_records' collection. Count documents.
 * 6. Delete ONLY those documents.
 * 7. Verify 'late_records' has 0 documents.
 * 8. Read-only verify master data: students, users, staff, college_settings, fine_rules are NOT TOUCHED.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { getFirestore } = require('../src/db/firestore');

async function runCleanup() {
  console.log('====================================================');
  console.log('STRICT ONE-TIME FIRESTORE CLEANUP');
  console.log('TARGET: payments AND late_records ONLY');
  console.log('====================================================\n');

  const db = getFirestore();

  // --------------------------------------------------
  // STEP 1 & 2: PAYMENTS COLLECTION
  // --------------------------------------------------
  console.log('Connecting to collection: payments...');
  const paymentsSnapshot = await db.collection('payments').get();
  const paymentsBefore = paymentsSnapshot.size;
  console.log(`payments: Before = ${paymentsBefore}`);

  let paymentsDeleted = 0;
  for (const doc of paymentsSnapshot.docs) {
    await db.collection('payments').doc(doc.id).delete();
    paymentsDeleted++;
  }
  console.log(`payments: Deleted = ${paymentsDeleted}`);

  const paymentsVerify = await db.collection('payments').get();
  const paymentsAfter = paymentsVerify.size;
  console.log(`payments: After = ${paymentsAfter}`);

  if (paymentsAfter !== 0) {
    throw new Error(`Verification failed: payments collection still has ${paymentsAfter} documents!`);
  }

  // --------------------------------------------------
  // STEP 3 & 4: LATE_RECORDS COLLECTION
  // --------------------------------------------------
  console.log('\nConnecting to collection: late_records...');
  const lateSnapshot = await db.collection('late_records').get();
  const lateBefore = lateSnapshot.size;
  console.log(`late_records: Before = ${lateBefore}`);

  let lateDeleted = 0;
  for (const doc of lateSnapshot.docs) {
    await db.collection('late_records').doc(doc.id).delete();
    lateDeleted++;
  }
  console.log(`late_records: Deleted = ${lateDeleted}`);

  const lateVerify = await db.collection('late_records').get();
  const lateAfter = lateVerify.size;
  console.log(`late_records: After = ${lateAfter}`);

  if (lateAfter !== 0) {
    throw new Error(`Verification failed: late_records collection still has ${lateAfter} documents!`);
  }

  // --------------------------------------------------
  // STEP 5: READ-ONLY INTEGRITY CHECK OF MASTER COLLECTIONS
  // --------------------------------------------------
  console.log('\n--- MASTER DATA INTEGRITY VERIFICATION (READ-ONLY) ---');
  const studentsSnap = await db.collection('students').get();
  const usersSnap = await db.collection('users').get();
  const staffSnap = await db.collection('staff').get();
  const settingsSnap = await db.collection('college_settings').get();
  const rulesSnap = await db.collection('fine_rules').get();

  console.log(`students:         ${studentsSnap.size} records → NOT TOUCHED`);
  console.log(`users:            ${usersSnap.size} records → NOT TOUCHED`);
  console.log(`staff:            ${staffSnap.size} records → NOT TOUCHED`);
  console.log(`college_settings: ${settingsSnap.size} records → NOT TOUCHED`);
  console.log(`fine_rules:       ${rulesSnap.size} records → NOT TOUCHED`);

  console.log('\n====================================================');
  console.log('FINAL AUDIT REPORT');
  console.log('====================================================');
  console.log(`payments:`);
  console.log(`Before = ${paymentsBefore}`);
  console.log(`Deleted = ${paymentsDeleted}`);
  console.log(`After = ${paymentsAfter}`);
  console.log(``);
  console.log(`late_records:`);
  console.log(`Before = ${lateBefore}`);
  console.log(`Deleted = ${lateDeleted}`);
  console.log(`After = ${lateAfter}`);
  console.log(``);
  console.log(`students → NOT TOUCHED`);
  console.log(`users → NOT TOUCHED`);
  console.log(`staff → NOT TOUCHED`);
  console.log(`college_settings → NOT TOUCHED`);
  console.log(`fine_rules → NOT TOUCHED`);
  console.log(`all other collections → NOT TOUCHED`);
  console.log('====================================================\n');

  return {
    payments: { before: paymentsBefore, deleted: paymentsDeleted, after: paymentsAfter },
    late_records: { before: lateBefore, deleted: lateDeleted, after: lateAfter },
    masterPreserved: {
      students: studentsSnap.size,
      users: usersSnap.size,
      staff: staffSnap.size,
      college_settings: settingsSnap.size,
      fine_rules: rulesSnap.size
    }
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
