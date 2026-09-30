-- ====================================================================
-- ONTIME - College Late-Arrival & Fine Management System
-- PostgreSQL Database Schema
-- ====================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables in reverse dependency order if recreating
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS late_records CASCADE;
DROP TABLE IF EXISTS fine_rules CASCADE;
DROP TABLE IF EXISTS college_settings CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- --------------------------------------------------------------------
-- 1. USERS TABLE
-- --------------------------------------------------------------------
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'STAFF', 'STUDENT')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- --------------------------------------------------------------------
-- 2. STUDENTS TABLE
-- --------------------------------------------------------------------
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    student_code VARCHAR(50) NOT NULL UNIQUE, -- e.g. STU001 (used on barcode)
    name VARCHAR(150) NOT NULL,
    register_number VARCHAR(100) NOT NULL UNIQUE,
    department VARCHAR(100) NOT NULL,
    year VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(30),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_students_student_code ON students(student_code);
CREATE INDEX idx_students_register_number ON students(register_number);
CREATE INDEX idx_students_status ON students(status);

-- --------------------------------------------------------------------
-- 3. STAFF TABLE
-- --------------------------------------------------------------------
CREATE TABLE staff (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    department VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_staff_employee_id ON staff(employee_id);

-- --------------------------------------------------------------------
-- 4. COLLEGE SETTINGS TABLE
-- --------------------------------------------------------------------
CREATE TABLE college_settings (
    id SERIAL PRIMARY KEY,
    reporting_time TIME NOT NULL DEFAULT '09:00:00',
    late_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 5. FINE RULES TABLE
-- --------------------------------------------------------------------
-- Example rules:
-- 1-10 mins -> 10
-- 11-20 mins -> 20
-- 21-30 mins -> 30
-- 31-60 mins -> 50
-- 61+ mins  -> 100 (max_minutes IS NULL)
CREATE TABLE fine_rules (
    id SERIAL PRIMARY KEY,
    min_minutes INTEGER NOT NULL,
    max_minutes INTEGER, -- NULL indicates no upper limit (e.g., 61+)
    fine_amount NUMERIC(10, 2) NOT NULL CHECK (fine_amount >= 0),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_minute_range CHECK (max_minutes IS NULL OR max_minutes >= min_minutes)
);

CREATE INDEX idx_fine_rules_active ON fine_rules(active);

-- --------------------------------------------------------------------
-- 6. LATE RECORDS TABLE
-- --------------------------------------------------------------------
CREATE TABLE late_records (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    reporting_time TIME NOT NULL,
    arrival_time TIME NOT NULL,
    late_minutes INTEGER NOT NULL DEFAULT 0,
    fine_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'WAIVED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Prevent duplicate late record for the exact same student on the same date
    CONSTRAINT uq_student_date UNIQUE (student_id, date)
);

CREATE INDEX idx_late_records_student ON late_records(student_id);
CREATE INDEX idx_late_records_date ON late_records(date);
CREATE INDEX idx_late_records_status ON late_records(status);

-- --------------------------------------------------------------------
-- 7. PAYMENTS TABLE
-- --------------------------------------------------------------------
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    late_record_id INTEGER NOT NULL REFERENCES late_records(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    payment_gateway VARCHAR(50) NOT NULL DEFAULT 'RAZORPAY',
    transaction_id VARCHAR(100) UNIQUE,
    gateway_order_id VARCHAR(100),
    gateway_signature VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'PENDING', 'SUCCESS', 'FAILED')),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_late_record ON payments(late_record_id);
CREATE INDEX idx_payments_student ON payments(student_id);
CREATE INDEX idx_payments_transaction ON payments(transaction_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_students_updated BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_staff_updated BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_college_settings_updated BEFORE UPDATE ON college_settings FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_fine_rules_updated BEFORE UPDATE ON fine_rules FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_late_records_updated BEFORE UPDATE ON late_records FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_timestamp();
