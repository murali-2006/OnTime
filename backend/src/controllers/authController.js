const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { userRepository, staffRepository, studentRepository } = require('../db/repositories/firestoreRepository');

/**
 * Handle user login for ADMIN, STAFF, STUDENT
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = email.trim().toLowerCase();

    // Query user in Firestore
    const user = await userRepository.findByEmail(cleanEmail);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Check account status
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'This account has been deactivated. Please contact the administrator.'
      });
    }

    // Verify password with bcrypt
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Load profile information from Firestore
    let profile = null;
    if (user.role === 'STAFF') {
      profile = await staffRepository.findByUserId(user.id);
    } else if (user.role === 'STUDENT') {
      profile = await studentRepository.findByUserId(user.id);
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user profile
 */
const getMe = async (req, res, next) => {
  try {
    const user = req.user;
    let profile = null;

    if (user.role === 'STAFF') {
      profile = await staffRepository.findByUserId(user.id);
    } else if (user.role === 'STUDENT') {
      profile = await studentRepository.findByUserId(user.id);
    } else if (user.role === 'ADMIN') {
      profile = { name: 'System Administrator', department: 'College Administration' };
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  getMe
};
