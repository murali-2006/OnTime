const bcrypt = require('bcryptjs');
const {
  userRepository,
  studentRepository,
  lateRecordRepository,
  paymentRepository
} = require('../db/repositories/firestoreRepository');

/**
 * List all students with search and filtering
 */
const getAllStudents = async (req, res, next) => {
  try {
    const { search, department, year, status } = req.query;
    const students = await studentRepository.findAll({ search, department, year, status });

    res.json({
      success: true,
      count: students.length,
      students
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single student by code or ID
 */
const getStudentByCode = async (req, res, next) => {
  try {
    const { studentCode } = req.params;
    const student = await studentRepository.findByCode(studentCode);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student ID not found.'
      });
    }

    res.json({
      success: true,
      student
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new student and associated user account
 */
const createStudent = async (req, res, next) => {
  const { studentCode, name, registerNumber, department, year, email, phone, password } = req.body;

  try {
    // 1. Check for duplicates in Firestore
    const existingCode = await studentRepository.findByCode(studentCode);
    if (existingCode) {
      return res.status(409).json({ success: false, message: `Student ID "${studentCode}" is already in use.` });
    }

    const existingReg = await studentRepository.findByRegisterNumber(registerNumber);
    if (existingReg) {
      return res.status(409).json({ success: false, message: `Register Number "${registerNumber}" is already in use.` });
    }

    const existingEmail = await userRepository.findByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ success: false, message: `Email "${email}" is already registered.` });
    }

    // 2. Hash password (default to Student@123 if not provided)
    const rawPass = password && password.trim() ? password.trim() : 'Student@123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPass, salt);

    // 3. Create user account
    const user = await userRepository.create({
      email: email.trim().toLowerCase(),
      password_hash: passwordHash,
      role: 'STUDENT',
      status: 'ACTIVE'
    });

    // 4. Create student profile
    const student = await studentRepository.create({
      studentCode,
      name,
      registerNumber,
      department,
      year,
      email,
      phone,
      status: 'ACTIVE',
      user_id: user.id
    });

    res.status(201).json({
      success: true,
      message: 'Student enrolled successfully.',
      student
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update student profile details
 */
const updateStudent = async (req, res, next) => {
  const { id } = req.params;
  const { name, registerNumber, department, year, email, phone } = req.body;

  try {
    const existing = await studentRepository.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (registerNumber !== undefined) updates.register_number = registerNumber.trim().toUpperCase();
    if (department !== undefined) updates.department = department.trim();
    if (year !== undefined) updates.year = year.trim();
    if (email !== undefined) updates.email = email.trim().toLowerCase();
    if (phone !== undefined) updates.phone = phone ? phone.trim() : null;

    const updated = await studentRepository.update(id, updates);

    // If email changed, also update the linked user login email
    if (email && existing.user_id) {
      await userRepository.update(existing.user_id, { email: email.trim().toLowerCase() });
    }

    res.json({
      success: true,
      message: 'Student details updated successfully.',
      student: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Activate or Deactivate student account
 */
const toggleStudentStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['ACTIVE', 'INACTIVE'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status. Must be either ACTIVE or INACTIVE.'
    });
  }

  try {
    const existing = await studentRepository.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    await studentRepository.update(id, { status });

    if (existing.user_id) {
      await userRepository.update(existing.user_id, { status });
    }

    res.json({
      success: true,
      message: `Student account has been set to ${status}.`,
      studentId: id,
      status
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete student and associated records safely
 */
const deleteStudent = async (req, res, next) => {
  const { id } = req.params;

  try {
    const student = await studentRepository.findById(id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    // Safely delete dependent records in order to ensure referential integrity
    await paymentRepository.deleteByStudentId(id);
    await lateRecordRepository.deleteByStudentId(id);
    await studentRepository.delete(id);

    // Clean up associated user account if one was created for this student
    if (student.user_id) {
      await userRepository.delete(student.user_id);
    }

    res.json({
      success: true,
      message: `Student "${student.name}" deleted successfully.`,
      studentId: id
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllStudents,
  getStudentByCode,
  createStudent,
  updateStudent,
  toggleStudentStatus,
  deleteStudent
};
