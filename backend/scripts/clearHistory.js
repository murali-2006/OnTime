/**
 * Standalone Historical Data Cleanup Script
 * Cleans: 'late_records' and 'payments' collections in Firestore.
 * Strictly Preserves:
 *   - 'students' (master student profiles, register numbers, barcodes)
 *   - 'users' (auth accounts)
 *   - 'staff' (staff profiles)
 *   - 'college_settings' (reporting times, thresholds)
 *   - 'fine_rules' (fine tiers and configuration)
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { lateRecordRepository } = require('../src/db/repositories/firestoreRepository');

async function runCleanup() {
  console.log('🧹 Starting safe historical data cleanup...');
  try {
    const result = await lateRecordRepository.resetTodayDemoRecords({ clearAll: true });
    console.log(`✅ Cleanup completed successfully!`);
    console.log(`   - Deleted late records: ${result.deletedLateRecordsCount}`);
    console.log(`   - Deleted payment transactions: ${result.deletedPaymentsCount}`);
    console.log(`   - Students, staff, fine rules, and settings preserved 100%.`);
    return result;
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    throw error;
  }
}

if (require.main === module) {
  runCleanup().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = runCleanup;
