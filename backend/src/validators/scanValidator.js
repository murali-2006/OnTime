const validateScan = (req, res, next) => {
  const { studentCode } = req.body;

  if (!studentCode || typeof studentCode !== 'string' || !studentCode.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Barcode data is required. Please scan or enter a valid Student ID.'
    });
  }

  // Basic sanity check: trim and uppercase
  req.body.studentCode = studentCode.trim().toUpperCase();
  next();
};

module.exports = {
  validateScan
};
