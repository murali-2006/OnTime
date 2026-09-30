const jwt = require('jsonwebtoken');
const config = require('../config');
const { userRepository, staffRepository, studentRepository } = require('../db/repositories/firestoreRepository');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Session expired. Please log in again.'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization token.'
      });
    }

    // Verify user exists and is ACTIVE
    const { userRepository, staffRepository, studentRepository } = require('../db/repositories/firestoreRepository');
    const user = await userRepository.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account not found.'
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive. Please contact administration.'
      });
    }

    // If role is STAFF or STUDENT, fetch their associated profile id
    if (user.role === 'STAFF') {
      const staffProfile = await staffRepository.findByUserId(user.id);
      if (staffProfile) {
        user.staffProfile = staffProfile;
      }
    } else if (user.role === 'STUDENT') {
      const studentProfile = await studentRepository.findByUserId(user.id);
      if (studentProfile) {
        user.studentProfile = studentProfile;
      }
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication Middleware Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.'
    });
  }
};

module.exports = authenticate;
