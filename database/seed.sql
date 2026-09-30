-- ====================================================================
-- ONTIME - College Late-Arrival & Fine Management System
-- PostgreSQL Initial / Development Seed Data
-- ====================================================================

-- 1. Insert Initial College Settings (Session Timings: 1st Period: 09:00 AM, 1st Break: 11:00 AM, Lunch: 1:15 PM, 2nd Break: 3:00 PM)
INSERT INTO college_settings (id, reporting_time, late_enabled)
VALUES (1, '09:00:00', TRUE)
ON CONFLICT (id) DO UPDATE 
SET reporting_time = EXCLUDED.reporting_time,
    late_enabled = EXCLUDED.late_enabled;

-- 2. Insert Default Fine Rules (Configurable via Admin panel)
-- Range 1: 1-10 mins -> ₹10
-- Range 2: 11-20 mins -> ₹20
-- Range 3: 21-30 mins -> ₹30
-- Range 4: 31-60 mins -> ₹50
-- Range 5: 61+ mins   -> ₹100 (max_minutes is NULL)
DELETE FROM fine_rules;
INSERT INTO fine_rules (min_minutes, max_minutes, fine_amount, active)
VALUES 
  (1, 10, 10.00, TRUE),
  (11, 20, 20.00, TRUE),
  (21, 30, 30.00, TRUE),
  (31, 60, 50.00, TRUE),
  (61, NULL, 100.00, TRUE);

-- 3. Insert Users (Admin, Staff, Students)
-- Default passwords:
-- Admin: Admin@123 -> $2a$10$fQ6tqS6iXWz7N4l.p7iT4.qTlmGgDkE91w8m9Jj3z2b1gYhL4gS72
-- Staff: Staff@123 -> $2a$10$wK1F5xP8rF0nO2kY.vP5OepQ5vO6yL9z8rK2jY6mN4aH8bC2fE5Wy
-- Students: Student@123 -> $2a$10$qV1R3tY7uI9oP1aS3dF5GeH7jK9lZ1xC3vB5nM7qW9eR1tY3uI5oP
-- (Note: backend/src/db/seed.js uses bcryptjs to dynamically generate matching hashes)

INSERT INTO users (id, email, password_hash, role, status)
VALUES 
  (1, 'admin@ontime.college', '$2a$10$cMm/J/6h/mUq9O4y9bMeeecYqCq86rNffTf9a3o6eS7gD6U4fL3Vq', 'ADMIN', 'ACTIVE'),
  (2, 'staff@ontime.college', '$2a$10$cMm/J/6h/mUq9O4y9bMeeecYqCq86rNffTf9a3o6eS7gD6U4fL3Vq', 'STAFF', 'ACTIVE'),
  (3, 'stu001@ontime.college', '$2a$10$cMm/J/6h/mUq9O4y9bMeeecYqCq86rNffTf9a3o6eS7gD6U4fL3Vq', 'STUDENT', 'ACTIVE'),
  (4, 'stu002@ontime.college', '$2a$10$cMm/J/6h/mUq9O4y9bMeeecYqCq86rNffTf9a3o6eS7gD6U4fL3Vq', 'STUDENT', 'ACTIVE'),
  (5, 'stu003@ontime.college', '$2a$10$cMm/J/6h/mUq9O4y9bMeeecYqCq86rNffTf9a3o6eS7gD6U4fL3Vq', 'STUDENT', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- Reset sequence for users
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- 4. Insert Staff Record
INSERT INTO staff (id, user_id, name, employee_id, department)
VALUES
  (1, 2, 'Prof. Robert Jenkins', 'EMP202401', 'Computer Science & Engineering')
ON CONFLICT (id) DO NOTHING;

SELECT setval('staff_id_seq', (SELECT MAX(id) FROM staff));

-- 5. Insert Student Records
INSERT INTO students (id, student_code, name, register_number, department, year, email, phone, status, user_id)
VALUES
  (1, '711224205037', 'Murali Krishna', '711224205037', 'Information Technology', '3rd Year', 'stu001@ontime.college', '+91 9876543210', 'ACTIVE', 3),
  (2, 'STU002', 'Jane Smith', 'REG2023002', 'Electronics & Communication', '2nd Year', 'stu002@ontime.college', '+91 9876543211', 'ACTIVE', 4),
  (3, 'STU003', 'Alex Kumar', 'REG2023003', 'Information Technology', '4th Year', 'stu003@ontime.college', '+91 9876543212', 'ACTIVE', 5)
ON CONFLICT (id) DO NOTHING;

SELECT setval('students_id_seq', (SELECT MAX(id) FROM students));

-- 6. Insert Sample Late Record & Payment for Demonstration
INSERT INTO late_records (id, student_id, staff_id, date, reporting_time, arrival_time, late_minutes, fine_amount, status)
VALUES
  (1, 1, 1, CURRENT_DATE - INTERVAL '1 day', '09:00:00', '09:23:00', 23, 30.00, 'PAID'),
  (2, 2, 1, CURRENT_DATE - INTERVAL '1 day', '09:00:00', '09:14:00', 14, 20.00, 'PENDING')
ON CONFLICT (id) DO NOTHING;

SELECT setval('late_records_id_seq', (SELECT MAX(id) FROM late_records));

-- 7. Insert Payment Record for Record #1 (PAID)
INSERT INTO payments (id, late_record_id, student_id, amount, payment_gateway, transaction_id, gateway_order_id, status, paid_at)
VALUES
  (1, 1, 1, 30.00, 'RAZORPAY', 'TXN_DEMO_20260928_001', 'order_demo_1001', 'SUCCESS', CURRENT_TIMESTAMP - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

SELECT setval('payments_id_seq', (SELECT MAX(id) FROM payments));
