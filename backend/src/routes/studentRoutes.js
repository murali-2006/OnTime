const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const { validateCreateStudent, validateUpdateStudent } = require('../validators/studentValidator');

router.use(authenticate);

// View students list (Admin and Staff)
router.get('/', authorize(['ADMIN', 'STAFF']), studentController.getAllStudents);

// View specific student (Admin and Staff)
router.get('/:studentCode', authorize(['ADMIN', 'STAFF']), studentController.getStudentByCode);

// Add student (Admin only)
router.post('/', authorize(['ADMIN']), validateCreateStudent, studentController.createStudent);

// Edit student (Admin only)
router.put('/:id', authorize(['ADMIN']), validateUpdateStudent, studentController.updateStudent);

// Toggle student status (Admin only)
router.patch('/:id/status', authorize(['ADMIN']), studentController.toggleStudentStatus);

// Delete student (Admin only)
router.delete('/:id', authorize(['ADMIN']), studentController.deleteStudent);

module.exports = router;
