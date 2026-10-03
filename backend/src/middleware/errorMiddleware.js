/**
 * Centralized Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('[Error Middleware Captured]:', {
    url: req.originalUrl,
    method: req.method,
    message: err.message,
    code: err.code
  });

  // Handle unique constraint or duplicate record violations
  if (err.code === '23505') {
    let customMsg = 'A record with this identifier already exists.';
    if (err.constraint === 'uq_student_date') {
      customMsg = "Today's arrival has already been recorded for this student.";
    } else if (err.constraint && err.constraint.includes('student_code')) {
      customMsg = 'A student with this Student Code already exists.';
    } else if (err.constraint && err.constraint.includes('register_number')) {
      customMsg = 'A student with this Register Number already exists.';
    } else if (err.constraint && err.constraint.includes('email')) {
      customMsg = 'This email address is already registered.';
    }
    return res.status(409).json({
      success: false,
      message: customMsg
    });
  }

  // Handle foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referenced entity was not found.'
    });
  }

  // Safe client response (do not expose raw DB errors)
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred. Please try again later.'
    : err.message || 'Something went wrong. Please try again.';

  res.status(statusCode).json({
    success: false,
    message
  });
};

module.exports = errorHandler;
