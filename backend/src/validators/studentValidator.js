const validateCreateStudent = (req, res, next) => {
  const { studentCode, name, registerNumber, department, year, email, phone, password } = req.body;

  const errors = [];

  if (!studentCode || !studentCode.trim()) {
    errors.push('Student ID / Code (e.g. STU001) is required.');
  }

  if (!name || !name.trim()) {
    errors.push('Student full name is required.');
  }

  if (!registerNumber || !registerNumber.trim()) {
    errors.push('Register Number is required.');
  }

  if (!department || !department.trim()) {
    errors.push('Department is required.');
  }

  if (!year || !year.trim()) {
    errors.push('Academic year is required.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email.trim())) {
    errors.push('A valid email address is required.');
  }

  if (password && password.length < 6) {
    errors.push('Password must be at least 6 characters long.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors[0],
      errors
    });
  }

  next();
};

const validateUpdateStudent = (req, res, next) => {
  const { name, registerNumber, department, year, email } = req.body;
  const errors = [];

  if (name !== undefined && !name.trim()) errors.push('Name cannot be empty.');
  if (registerNumber !== undefined && !registerNumber.trim()) errors.push('Register Number cannot be empty.');
  if (department !== undefined && !department.trim()) errors.push('Department cannot be empty.');
  if (year !== undefined && !year.trim()) errors.push('Year cannot be empty.');

  if (email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errors.push('A valid email address is required.');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors[0],
      errors
    });
  }

  next();
};

module.exports = {
  validateCreateStudent,
  validateUpdateStudent
};
