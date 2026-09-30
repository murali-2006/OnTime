const { getFirestore } = require('./firestore');
const pg = require('./index');

async function migratePostgresToFirestore() {
  console.log('🚀 Starting Data Migration: PostgreSQL -> Firebase Firestore...');
  const firestore = getFirestore();

  try {
    // 1. Migrate Users
    console.log('⏳ Migrating users...');
    const usersRes = await pg.query('SELECT * FROM users ORDER BY id ASC');
    let userCount = 0;
    for (const u of usersRes.rows) {
      await firestore.collection('users').doc(String(u.id)).set({
        id: u.id,
        email: u.email.toLowerCase(),
        password_hash: u.password_hash,
        role: u.role,
        status: u.status,
        created_at: u.created_at ? new Date(u.created_at).toISOString() : new Date().toISOString(),
        updated_at: u.updated_at ? new Date(u.updated_at).toISOString() : new Date().toISOString()
      }, { merge: true });
      userCount++;
    }
    console.log(`✅ Migrated ${userCount} users to Firestore.`);

    // 2. Migrate Students
    console.log('⏳ Migrating students...');
    const studentsRes = await pg.query('SELECT * FROM students ORDER BY id ASC');
    let studentCount = 0;
    for (const s of studentsRes.rows) {
      await firestore.collection('students').doc(String(s.id)).set({
        id: s.id,
        student_code: s.student_code,
        name: s.name,
        register_number: s.register_number,
        department: s.department,
        year: s.year,
        email: s.email.toLowerCase(),
        phone: s.phone,
        status: s.status,
        user_id: s.user_id,
        created_at: s.created_at ? new Date(s.created_at).toISOString() : new Date().toISOString(),
        updated_at: s.updated_at ? new Date(s.updated_at).toISOString() : new Date().toISOString()
      }, { merge: true });
      studentCount++;
    }
    console.log(`✅ Migrated ${studentCount} students to Firestore.`);

    // 3. Migrate Staff
    console.log('⏳ Migrating staff...');
    const staffRes = await pg.query('SELECT * FROM staff ORDER BY id ASC');
    let staffCount = 0;
    for (const st of staffRes.rows) {
      await firestore.collection('staff').doc(String(st.id)).set({
        id: st.id,
        user_id: st.user_id,
        name: st.name,
        employee_id: st.employee_id,
        department: st.department,
        created_at: st.created_at ? new Date(st.created_at).toISOString() : new Date().toISOString(),
        updated_at: st.updated_at ? new Date(st.updated_at).toISOString() : new Date().toISOString()
      }, { merge: true });
      staffCount++;
    }
    console.log(`✅ Migrated ${staffCount} staff records to Firestore.`);

    // 4. Migrate College Settings & 4 Sessions
    console.log('⏳ Migrating college settings...');
    const settingsRes = await pg.query('SELECT * FROM college_settings LIMIT 1');
    const settings = settingsRes.rows[0] || { reporting_time: '09:00:00', late_enabled: true };
    await firestore.collection('college_settings').doc('1').set({
      id: 1,
      reporting_time: settings.reporting_time || '09:00:00',
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
    console.log('✅ Migrated college settings & 4 session timings to Firestore.');

    // 5. Migrate Fine Rules
    console.log('⏳ Migrating fine rules...');
    const rulesRes = await pg.query('SELECT * FROM fine_rules ORDER BY id ASC');
    let ruleCount = 0;
    for (const r of rulesRes.rows) {
      await firestore.collection('fine_rules').doc(String(r.id)).set({
        id: r.id,
        min_minutes: parseInt(r.min_minutes, 10),
        max_minutes: r.max_minutes !== null ? parseInt(r.max_minutes, 10) : null,
        fine_amount: parseFloat(r.fine_amount).toFixed(2),
        active: r.active !== undefined ? Boolean(r.active) : true,
        created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }, { merge: true });
      ruleCount++;
    }
    console.log(`✅ Migrated ${ruleCount} fine rules to Firestore.`);

    // 6. Migrate Late Records
    console.log('⏳ Migrating late records...');
    const lrRes = await pg.query('SELECT * FROM late_records ORDER BY id ASC');
    let lrCount = 0;
    for (const lr of lrRes.rows) {
      const recDate = lr.date ? (new Date(lr.date).toISOString().split('T')[0]) : new Date().toISOString().split('T')[0];
      await firestore.collection('late_records').doc(String(lr.id)).set({
        id: lr.id,
        student_id: lr.student_id,
        staff_id: lr.staff_id,
        date: recDate,
        reporting_time: lr.reporting_time,
        arrival_time: lr.arrival_time,
        late_minutes: lr.late_minutes,
        fine_amount: parseFloat(lr.fine_amount).toFixed(2),
        status: lr.status,
        created_at: lr.created_at ? new Date(lr.created_at).toISOString() : new Date().toISOString(),
        updated_at: lr.updated_at ? new Date(lr.updated_at).toISOString() : new Date().toISOString()
      }, { merge: true });
      lrCount++;
    }
    console.log(`✅ Migrated ${lrCount} late records to Firestore.`);

    // 7. Migrate Payments
    console.log('⏳ Migrating payments...');
    const payRes = await pg.query('SELECT * FROM payments ORDER BY id ASC');
    let payCount = 0;
    for (const p of payRes.rows) {
      await firestore.collection('payments').doc(String(p.id)).set({
        id: p.id,
        late_record_id: p.late_record_id,
        student_id: p.student_id,
        amount: parseFloat(p.amount).toFixed(2),
        payment_gateway: p.payment_gateway,
        transaction_id: p.transaction_id,
        gateway_order_id: p.gateway_order_id,
        gateway_signature: p.gateway_signature,
        status: p.status,
        paid_at: p.paid_at ? new Date(p.paid_at).toISOString() : null,
        created_at: p.created_at ? new Date(p.created_at).toISOString() : new Date().toISOString(),
        updated_at: p.updated_at ? new Date(p.updated_at).toISOString() : new Date().toISOString()
      }, { merge: true });
      payCount++;
    }
    console.log(`✅ Migrated ${payCount} payments to Firestore.`);

    console.log('\n🎉 ALL PostgreSQL data successfully migrated to Firebase Firestore!');
    return {
      success: true,
      users: userCount,
      students: studentCount,
      staff: staffCount,
      fineRules: ruleCount,
      lateRecords: lrCount,
      payments: payCount
    };
  } catch (error) {
    console.error('❌ Data migration failed:', error.message);
    throw error;
  }
}

if (require.main === module) {
  migratePostgresToFirestore()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = migratePostgresToFirestore;
