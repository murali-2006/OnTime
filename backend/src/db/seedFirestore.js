const bcrypt = require('bcryptjs');
const { getFirestore } = require('./firestore');

async function seedFirestore() {
  console.log('🌱 Seeding Firebase Firestore with demo data...');
  const firestore = getFirestore();

  try {
    // 1. Settings (Session Timings: 1st Period: 09:00 AM, 1st Break: 11:00 AM, Lunch: 1:15 PM, 2nd Break: 3:00 PM)
    await firestore.collection('college_settings').doc('1').set({
      id: 1,
      reporting_time: '09:00:00',
      late_enabled: true,
      sessions: [
        { name: '1st Period', time: '09:00:00', label: '9:00 AM' },
        { name: '1st Break', time: '11:00:00', label: '11:00 AM' },
        { name: 'Lunch', time: '13:15:00', label: '1:15 PM' },
        { name: '2nd Break', time: '15:00:00', label: '3:00 PM' }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // 2. Fine Rules
    const fineRules = [
      { id: 1, min_minutes: 1, max_minutes: 10, fine_amount: '10.00', active: true },
      { id: 2, min_minutes: 11, max_minutes: 20, fine_amount: '20.00', active: true },
      { id: 3, min_minutes: 21, max_minutes: 30, fine_amount: '30.00', active: true },
      { id: 4, min_minutes: 31, max_minutes: 60, fine_amount: '50.00', active: true },
      { id: 5, min_minutes: 61, max_minutes: null, fine_amount: '100.00', active: true }
    ];

    for (const r of fineRules) {
      await firestore.collection('fine_rules').doc(String(r.id)).set({
        ...r,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    // 3. User Accounts with bcryptjs hashed passwords
    const salt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash('Admin@123', salt);
    const staffHash = await bcrypt.hash('Staff@123', salt);
    const studentHash = await bcrypt.hash('Student@123', salt);

    // Admin User
    await firestore.collection('users').doc('1').set({
      id: 1,
      email: 'admin@ontime.college',
      password_hash: adminHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Staff User
    await firestore.collection('users').doc('2').set({
      id: 2,
      email: 'staff@ontime.college',
      password_hash: staffHash,
      role: 'STAFF',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Staff Profile
    await firestore.collection('staff').doc('1').set({
      id: 1,
      user_id: 2,
      name: 'Professor JD',
      employee_id: 'EMP202401',
      department: 'Computer Science & Engineering',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Students Data (Murali Krishna with barcode 711224205037)
    const studentsData = [
      {
        id: 1,
        user_id: 3,
        code: '711224205037',
        name: 'Murali Krishna',
        reg: '711224205037',
        dept: 'Information Technology',
        year: '3rd Year',
        email: 'stu001@ontime.college',
        phone: '+91 9876543210'
      },
      {
        id: 2,
        user_id: 4,
        code: 'STU002',
        name: 'Muralikarthikeyan M',
        reg: '711224205038',
        dept: 'Information Technology',
        year: '3rd Year',
        email: 'stu002@ontime.college',
        phone: '+91 9876543211'
      },
      {
        id: 3,
        user_id: 5,
        code: 'STU003',
        name: 'Mukilavan K',
        reg: '711224205036',
        dept: 'Information Technology',
        year: '3rd Year',
        email: 'stu003@ontime.college',
        phone: '+91 9876543212'
      }
    ];

    for (const stu of studentsData) {
      // User doc
      await firestore.collection('users').doc(String(stu.user_id)).set({
        id: stu.user_id,
        email: stu.email,
        password_hash: studentHash,
        role: 'STUDENT',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Student doc
      await firestore.collection('students').doc(String(stu.id)).set({
        id: stu.id,
        student_code: stu.code,
        name: stu.name,
        register_number: stu.reg,
        department: stu.dept,
        year: stu.year,
        email: stu.email,
        phone: stu.phone,
        status: 'ACTIVE',
        user_id: stu.user_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    // Sample Late Records
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    await firestore.collection('late_records').doc('1').set({
      id: 1,
      student_id: 1,
      staff_id: 1,
      date: yesterday,
      reporting_time: '09:00:00',
      arrival_time: '09:23:00',
      late_minutes: 23,
      fine_amount: '30.00',
      status: 'PAID',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString()
    });

    await firestore.collection('payments').doc('1').set({
      id: 1,
      late_record_id: 1,
      student_id: 1,
      amount: '30.00',
      payment_gateway: 'RAZORPAY',
      transaction_id: 'TXN_DEMO_20260928_001',
      gateway_order_id: 'order_demo_1001',
      gateway_signature: null,
      status: 'SUCCESS',
      paid_at: new Date(Date.now() - 86400000).toISOString(),
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString()
    });

    await firestore.collection('late_records').doc('2').set({
      id: 2,
      student_id: 2,
      staff_id: 1,
      date: yesterday,
      reporting_time: '09:00:00',
      arrival_time: '09:14:00',
      late_minutes: 14,
      fine_amount: '20.00',
      status: 'PAID',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date().toISOString()
    });

    console.log('✅ Firebase Firestore seeded successfully with accounts, rules, and demo records:');
    console.log('   - Admin:   admin@ontime.college   / Admin@123');
    console.log('   - Staff:   staff@ontime.college   / Staff@123');
    console.log('   - Student: stu001@ontime.college  / Student@123 (Barcode: 711224205037 - Murali Krishna)');
    console.log('   - Student: stu002@ontime.college  / Student@123 (Barcode: STU002)');
    console.log('   - Student: stu003@ontime.college  / Student@123 (Barcode: STU003)');
  } catch (err) {
    console.error('❌ Firestore seeding error:', err.message);
    throw err;
  }
}

if (require.main === module) {
  seedFirestore()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seedFirestore;
