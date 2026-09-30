const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateLogin } = require('../validators/authValidator');
const authenticate = require('../middleware/authMiddleware');

// Public route: User login
router.post('/login', validateLogin, authController.login);

// Protected route: Current user details
router.get('/me', authenticate, authController.getMe);

module.exports = router;
