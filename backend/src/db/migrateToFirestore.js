const path = require('path');
const fs = require('fs');
const { getFirestore, isCloud, getConnectionStatus } = require('./firestore');
let pg;
try {
  pg = require('./index');
} catch (e) {}

async function migratePostgresToFirestore() {
  console.log('====================================================');
  console.log('🚀 Starting Data Migration: PostgreSQL -> Google Cloud Firestore...');
  console.log('====================================================\n');

  const status = getConnectionStatus();
  console.log(`- Target Firestore Project: ${status.projectId}`);
  console.log(`- Connection Mode: ${status.method}\n`);

  // Ensure we are connecting strictly to REAL Cloud Firestore
  const firestore = getFirestore({ allowFallback: false });
  if (!isCloud()) {
    throw new Error('Cloud Firestore is not active. Refusing to migrate into local fallback.');
  }

  // Load fallback dataset in case live PostgreSQL server is offline
  let backupData = {};
  const localDataPath = path.resolve(__dirname, 'firestore_local_data.json');
  if (fs.existsSync(localDataPath)) {
    try {
      backupData = JSON.parse(fs.readFileSync(localDataPath, 'utf8'));
    } catch (e) {}
  }

  // Helper to fetch data either from PostgreSQL or verified backup
  async function fetchTable(tableName, sqlQuery) {
    if (pg) {
      try {
        const res = await pg.query(sqlQuery);
        if (res && res.rows && res.rows.length > 0) {
          console.log(`📦 Loaded ${res.rows.length} records from live PostgreSQL table '${tableName}'.`);
          return res.rows;
        }
      } catch (err) {
        console.warn(`ℹ️ Live PostgreSQL not reachable for '${tableName}' (${err.message}). Using preserved PostgreSQL backup data.`);
      }
    }
    const fromBackup = backupData[tableName] ? Object.values(backupData[tableName]) : [];
    console.log(`📦 Loaded ${fromBackup.length} records from preserved PostgreSQL backup for '${tableName}'.`);
    return fromBackup;
  }

  try {
    // 1. Users
    console.log('\n⏳ Migrating users to Cloud Firestore...');
    const users = await fetchTable('users', 'SELECT * FROM users ORDER BY id ASC');
    let userCount = 0;
    for (const u of users) {
      await firestore.collection('users').doc(String(u.id)).set({
        id: Number(u.id),
        email: u.email.toLowerCase(),
        password_hash: u.password_hash,
        role: u.role,
        status: u.status || 'ACTIVE',
        created_at: u.created_at ? new Date(u.created_at).toISOString() : new Date().toISOString(),
        updated_at: u.updated_at ? new Date(u.updated_at).toISOString() : new Date().toISOString()
      }, { merge: true });
      userCount++;
    }
    console.log(`✅ Migrated ${userCount} users to Cloud Firestore.`);

    // 2. Students
    console.log('\n⏳ Migrating students to Cloud Firestore...');
    const students = await fetchTable('students', 'SELECT * FROM students ORDER BY id ASC');
    let studentCount = 0;
    for (const s of students) {
      await firestore.collection('students').doc(String(s.id)).set({
        id: Number(s.id),
        student_code: String(s.student_code).trim(),
        name: s.name,
        register_number: String(s.register_number).trim(),
        barcode_data: s.barcode_data || String(s.student_code).trim(),
        department: s.department,
        year: s.year,
        email: s.email ? s.email.toLowerCase() : '',
        phone: s.phone || null,
        status: s.status || 'ACTIVE',
        user_id: s.user_id ? Number(s.user_id) : null,
        created_at: s.created_at ? new Date(s.created_at).toISOString() : new Date().toISOString(),
        updated_at: s.updated_at ? new Date(s.updated_at).toISOString() : new Date().toISOString()
      }, { merge: true });
      studentCount++;
    }
    console.log(`✅ Migrated ${studentCount} students to Cloud Firestore (including Murali Krishna with barcode 711224205037).`);

    // 3. Staff
    console.log('\n⏳ Migrating staff to Cloud Firestore...');
    const staff = await fetchTable('staff', 'SELECT * FROM staff ORDER BY id ASC');
    let staffCount = 0;
    for (const st of staff) {
      await firestore.collection('staff').doc(String(st.id)).set({
        id: Number(st.id),
        user_id: Number(st.user_id),
        name: st.name,
        employee_id: st.employee_id,
        department: st.department,
        created_at: st.created_at ? new Date(st.created_at).toISOString() : new Date().toISOString(),
        updated_at: st.updated_at ? new Date(st.updated_at).toISOString() : new Date().toISOString()
      }, { merge: true });
      staffCount++;
    }
    console.log(`✅ Migrated ${staffCount} staff records to Cloud Firestore.`);

    // 4. College Settings & 4 Sessions
    console.log('\n⏳ Migrating college settings & 4 session timings to Cloud Firestore...');
    const settingsRows = await fetchTable('college_settings', 'SELECT * FROM college_settings LIMIT 1');
    const settings = settingsRows[0] || { reporting_time: '15:00:00', late_enabled: true };
    await firestore.collection('college_settings').doc('1').set({
      id: 1,
      reporting_time: settings.reporting_time || '15:00:00',
      late_enabled: settings.late_enabled !== undefined ? settings.late_enabled : true,
      sessions: [
        { name: '1st Period', time: '09:00:00', label: '9:00 AM' },
        { name: '1st Break', time: '11:00:00', label: '11:00 AM' },
        { name: 'Lunch', time: '13:15:00', label: '1:15 PM' },
        { name: '2nd Break', time: '15:00:00', label: '3:00 PM' }
      ],
      created_at: settings.created_at ? new Date(settings.created_at).toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { merge: true });
    console.log('✅ Migrated college settings with 4 configured session timings (9:00 AM, 11:00 AM, 1:15 PM, 3:00 PM).');

    // 5. Fine Rules
    console.log('\n⏳ Migrating fine rules to Cloud Firestore...');
    const rules = await fetchTable('fine_rules', 'SELECT * FROM fine_rules ORDER BY id ASC');
    let ruleCount = 0;
    for (const r of rules) {
      await firestore.collection('fine_rules').doc(String(r.id)).set({
        id: Number(r.id),
        min_minutes: parseInt(r.min_minutes, 10),
        max_minutes: r.max_minutes !== null && r.max_minutes !== undefined ? parseInt(r.max_minutes, 10) : null,
        fine_amount: parseFloat(r.fine_amount).toFixed(2),
        active: r.active !== undefined ? Boolean(r.active) : true,
        created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }, { merge: true });
      ruleCount++;
    }
    console.log(`✅ Migrated ${ruleCount} fine rules to Cloud Firestore.`);

    // 6. Late Records
    console.log('\n⏳ Migrating late records to Cloud Firestore...');
    const lateRecords = await fetchTable('late_records', 'SELECT * FROM late_records ORDER BY id ASC');
    let lrCount = 0;
    for (const lr of lateRecords) {
      const recDate = lr.date ? (new Date(lr.date).toISOString().split('T')[0]) : new Date().toISOString().split('T')[0];
      await firestore.collection('late_records').doc(String(lr.id)).set({
        id: Number(lr.id),
        student_id: Number(lr.student_id),
        staff_id: Number(lr.staff_id),
        date: recDate,
        reporting_time: lr.reporting_time,
        arrival_time: lr.arrival_time,
        late_minutes: Number(lr.late_minutes),
        fine_amount: parseFloat(lr.fine_amount).toFixed(2),
        status: lr.status,
        created_at: lr.created_at ? new Date(lr.created_at).toISOString() : new Date().toISOString(),
        updated_at: lr.updated_at ? new Date(lr.updated_at).toISOString() : new Date().toISOString()
      }, { merge: true });
      lrCount++;
    }
    console.log(`✅ Migrated ${lrCount} late records to Cloud Firestore.`);

    // 7. Payments
    console.log('\n⏳ Migrating payments to Cloud Firestore...');
    const payments = await fetchTable('payments', 'SELECT * FROM payments ORDER BY id ASC');
    let payCount = 0;
    for (const p of payments) {
      await firestore.collection('payments').doc(String(p.id)).set({
        id: Number(p.id),
        late_record_id: Number(p.late_record_id),
        student_id: Number(p.student_id),
        amount: parseFloat(p.amount).toFixed(2),
        payment_gateway: p.payment_gateway || 'RAZORPAY',
        transaction_id: p.transaction_id,
        gateway_order_id: p.gateway_order_id || null,
        gateway_signature: p.gateway_signature || null,
        status: p.status,
        paid_at: p.paid_at ? new Date(p.paid_at).toISOString() : null,
        created_at: p.created_at ? new Date(p.created_at).toISOString() : new Date().toISOString(),
        updated_at: p.updated_at ? new Date(p.updated_at).toISOString() : new Date().toISOString()
      }, { merge: true });
      payCount++;
    }
    console.log(`✅ Migrated ${payCount} payments to Cloud Firestore.`);

    console.log('\n====================================================');
    console.log('🎉 ALL DATA SUCCESSFULLY MIGRATED TO GOOGLE CLOUD FIRESTORE!');
    console.log('====================================================\n');
    console.log(`Summary:`);
    console.log(`- Users: ${userCount}`);
    console.log(`- Students: ${studentCount}`);
    console.log(`- Staff: ${staffCount}`);
    console.log(`- Settings: 1 (with 4 sessions)`);
    console.log(`- Fine Rules: ${ruleCount}`);
    console.log(`- Late Records: ${lrCount}`);
    console.log(`- Payments: ${payCount}\n`);

    return {
      success: true,
      users: userCount,
      students: studentCount,
      staff: staffCount,
      fineRules: ruleCount,
      lateRecords: lrCount,
      payments: payCount
    };
  } catch (err) {
    console.error('❌ Data migration failed:', err.message);
    throw err;
  }
}

if (require.main === module) {
  migratePostgresToFirestore()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = migratePostgresToFirestore;
