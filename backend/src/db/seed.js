const bcrypt = require('bcryptjs');
const { pool } = require('./index');

async function seedDatabase() {
  console.log('🌱 Seeding PostgreSQL database with initial data...');
  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    if (err.code === '28P01') {
      console.error('\n❌ PostgreSQL Authentication Failed:');
      console.error('   Please update DB_PASSWORD in backend/.env with your actual PostgreSQL password.\n');
    } else {
      console.error('\n❌ Could not connect to PostgreSQL:', err.message, '\n');
    }
    process.exit(1);
  }

  try {
    await client.query('BEGIN');

    // 1. Settings (Session Timings: 1st Period: 09:00 AM, 1st Break: 11:00 AM, Lunch: 1:15 PM, 2nd Break: 3:00 PM)
    await client.query(`
      INSERT INTO college_settings (id, reporting_time, late_enabled)
      VALUES (1, '09:00:00', TRUE)
      ON CONFLICT (id) DO UPDATE 
      SET reporting_time = EXCLUDED.reporting_time,
          late_enabled = EXCLUDED.late_enabled;
    `);

    // 2. Fine Rules
    await client.query('DELETE FROM fine_rules');
    await client.query(`
      INSERT INTO fine_rules (min_minutes, max_minutes, fine_amount, active)
      VALUES 
        (1, 10, 10.00, TRUE),
        (11, 20, 20.00, TRUE),
        (21, 30, 30.00, TRUE),
        (31, 60, 50.00, TRUE),
        (61, NULL, 100.00, TRUE);
    `);

    // 3. User Accounts with bcryptjs hashed passwords
    const salt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash('Admin@123', salt);
    const staffHash = await bcrypt.hash('Staff@123', salt);
    const studentHash = await bcrypt.hash('Student@123', salt);

    // Admin
    const adminRes = await client.query(`
      INSERT INTO users (email, password_hash, role, status)
      VALUES ($1, $2, 'ADMIN', 'ACTIVE')
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
      RETURNING id;
    `, ['admin@ontime.college', adminHash]);

    // Staff
    const staffRes = await client.query(`
      INSERT INTO users (email, password_hash, role, status)
      VALUES ($1, $2, 'STAFF', 'ACTIVE')
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
      RETURNING id;
    `, ['staff@ontime.college', staffHash]);
    const staffUserId = staffRes.rows[0].id;

    // Staff Profile
    const staffProfileRes = await client.query(`
      INSERT INTO staff (user_id, name, employee_id, department)
      VALUES ($1, 'Prof. Robert Jenkins', 'EMP202401', 'Computer Science & Engineering')
      ON CONFLICT (employee_id) DO UPDATE SET user_id = EXCLUDED.user_id, name = EXCLUDED.name
      RETURNING id;
    `, [staffUserId]);
    const staffId = staffProfileRes.rows[0].id;

    // Sample Students
    const studentData = [
      {
        code: '711224205037',
        name: 'Murali Krishna',
        reg: '711224205037',
        dept: 'Information Technology',
        year: '3rd Year',
        email: 'stu001@ontime.college',
        phone: '+91 9876543210'
      },
      {
        code: 'STU002',
        name: 'Jane Smith',
        reg: 'REG2023002',
        dept: 'Electronics & Communication',
        year: '2nd Year',
        email: 'stu002@ontime.college',
        phone: '+91 9876543211'
      },
      {
        code: 'STU003',
        name: 'Alex Kumar',
        reg: 'REG2023003',
        dept: 'Information Technology',
        year: '4th Year',
        email: 'stu003@ontime.college',
        phone: '+91 9876543212'
      }
    ];

    const studentIds = [];
    for (const stu of studentData) {
      const uRes = await client.query(`
        INSERT INTO users (email, password_hash, role, status)
        VALUES ($1, $2, 'STUDENT', 'ACTIVE')
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
        RETURNING id;
      `, [stu.email, studentHash]);
      const stuUserId = uRes.rows[0].id;

      const sRes = await client.query(`
        INSERT INTO students (student_code, name, register_number, department, year, email, phone, status, user_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', $8)
        ON CONFLICT (student_code) DO UPDATE 
        SET name = EXCLUDED.name, register_number = EXCLUDED.register_number, user_id = EXCLUDED.user_id
        RETURNING id;
      `, [stu.code, stu.name, stu.reg, stu.dept, stu.year, stu.email, stu.phone, stuUserId]);

      studentIds.push(sRes.rows[0].id);
    }

    // Sample Late Records & Payment for demonstration
    // STU001 yesterday late by 23 min (PAID)
    const late1 = await client.query(`
      INSERT INTO late_records (student_id, staff_id, date, reporting_time, arrival_time, late_minutes, fine_amount, status)
      VALUES ($1, $2, CURRENT_DATE - INTERVAL '1 day', '09:00:00', '09:23:00', 23, 30.00, 'PAID')
      ON CONFLICT (student_id, date) DO NOTHING
      RETURNING id;
    `, [studentIds[0], staffId]);

    if (late1.rows.length > 0) {
      await client.query(`
        INSERT INTO payments (late_record_id, student_id, amount, payment_gateway, transaction_id, gateway_order_id, status, paid_at)
        VALUES ($1, $2, 30.00, 'RAZORPAY', 'TXN_DEMO_20260928_001', 'order_demo_1001', 'SUCCESS', CURRENT_TIMESTAMP - INTERVAL '1 day')
        ON CONFLICT (transaction_id) DO NOTHING;
      `, [late1.rows[0].id, studentIds[0]]);
    }

    // STU002 yesterday late by 14 min (PENDING)
    await client.query(`
      INSERT INTO late_records (student_id, staff_id, date, reporting_time, arrival_time, late_minutes, fine_amount, status)
      VALUES ($1, $2, CURRENT_DATE - INTERVAL '1 day', '09:00:00', '09:14:00', 14, 20.00, 'PENDING')
      ON CONFLICT (student_id, date) DO NOTHING;
    `, [studentIds[1], staffId]);

    await client.query('COMMIT');
    console.log('✅ PostgreSQL Database seeded successfully with accounts, rules, and demo records:');
    console.log('   - Admin:   admin@ontime.college   / Admin@123');
    console.log('   - Staff:   staff@ontime.college   / Staff@123');
    console.log('   - Student: stu001@ontime.college  / Student@123 (Barcode: 711224205037 - Murali Krishna)');
    console.log('   - Student: stu002@ontime.college  / Student@123 (Barcode: STU002)');
    console.log('   - Student: stu003@ontime.college  / Student@123 (Barcode: STU003)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
