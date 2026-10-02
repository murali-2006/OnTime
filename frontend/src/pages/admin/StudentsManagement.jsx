import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Edit2,
  Trash2,
  ScanBarcode as BarcodeIcon,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import BarcodeRenderer from '../../components/BarcodeRenderer';
import Toast from '../../components/Toast';

const StudentsManagement = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    studentCode: '',
    name: '',
    registerNumber: '',
    department: '',
    year: '1st Year',
    email: '',
    phone: '',
    password: ''
  });

  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (deptFilter) params.department = deptFilter;

      const res = await api.get('/students', { params });
      if (res.success) {
        setStudents(res.students);
      }
    } catch (err) {
      setToastMessage({ message: err.message || 'Failed to load students.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search, deptFilter]);

  const handleOpenAdd = () => {
    setFormData({
      studentCode: '',
      name: '',
      registerNumber: '',
      department: 'Computer Science & Engineering',
      year: '1st Year',
      email: '',
      phone: '',
      password: ''
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (student) => {
    setSelectedStudent(student);
    setFormData({
      studentCode: student.student_code,
      name: student.name,
      registerNumber: student.register_number,
      department: student.department,
      year: student.year,
      email: student.email,
      phone: student.phone || '',
      password: ''
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleOpenBarcode = (student) => {
    setSelectedStudent(student);
    setIsBarcodeModalOpen(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await api.post('/students', formData);
      if (res.success) {
        setIsAddModalOpen(false);
        setToastMessage({ message: `Student ${res.student.name} added successfully!`, type: 'success' });
        fetchStudents();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to enroll student.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await api.put(`/students/${selectedStudent.id}`, formData);
      if (res.success) {
        setIsEditModalOpen(false);
        setToastMessage({ message: 'Student information updated successfully.', type: 'success' });
        fetchStudents();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to update student details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (student) => {
    setStudentToDelete(student);
  };

  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;
    setDeleting(true);

    try {
      const res = await api.delete(`/students/${studentToDelete.id}`);
      if (res.success) {
        setToastMessage({ message: res.message || 'Student deleted successfully.', type: 'success' });
        setStudentToDelete(null);
        fetchStudents();
      }
    } catch (err) {
      setToastMessage({ message: err.message || 'Failed to delete student.', type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {toastMessage && (
        <div className="toast-container">
          <Toast
            message={toastMessage.message}
            type={toastMessage.type}
            onClose={() => setToastMessage(null)}
          />
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Student Directory Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Manage enrolled students, unique barcode identifiers, and account statuses
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
          <UserPlus size={16} /> Enroll New Student
        </button>
      </div>

      {/* Filters & Search */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-input"
              style={{ width: '100%', paddingLeft: '2.5rem' }}
              placeholder="Search by name, ID (STU...), reg no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="">All Departments</option>
            <option value="Computer Science & Engineering">Computer Science & Engineering</option>
            <option value="Electronics & Communication">Electronics & Communication</option>
            <option value="Information Technology">Information Technology</option>
            <option value="Mechanical Engineering">Mechanical Engineering</option>
            <option value="Civil Engineering">Civil Engineering</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Student Name</th>
                <th>Register No.</th>
                <th>Department</th>
                <th>Year</th>
                <th>Email</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    Loading student records...
                  </td>
                </tr>
              ) : students.length > 0 ? (
                students.map((stu) => (
                  <tr key={stu.id}>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleOpenBarcode(stu)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontFamily: 'monospace', fontWeight: 700, gap: '0.35rem' }}
                        title="Click to view ID card barcode"
                      >
                        <BarcodeIcon size={14} color="var(--primary-400)" />
                        {stu.student_code}
                      </button>
                    </td>
                    <td style={{ fontWeight: 600 }}>{stu.name}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{stu.register_number}</td>
                    <td>{stu.department}</td>
                    <td>{stu.year}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{stu.email}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenEdit(stu)}
                          title="Edit Student"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleDeleteClick(stu)}
                          title="Delete Student"
                        >
                          <Trash2 size={14} color="#ef4444" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                    No students found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Enroll New Student"
        maxWidth="600px"
      >
        <form onSubmit={handleAddSubmit}>
          {formError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 500 }}>
              {formError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Student ID (Barcode Code) *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. STU004"
                value={formData.studentCode}
                onChange={(e) => setFormData({ ...formData, studentCode: e.target.value.toUpperCase() })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Register Number *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. REG2023004"
                value={formData.registerNumber}
                onChange={(e) => setFormData({ ...formData, registerNumber: e.target.value.toUpperCase() })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Student Full Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Michael Chen"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Department *</label>
              <select
                className="form-select"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              >
                <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                <option value="Electronics & Communication">Electronics & Communication</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Mechanical Engineering">Mechanical Engineering</option>
                <option value="Civil Engineering">Civil Engineering</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Year of Study *</label>
              <select
                className="form-select"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">College Email *</label>
              <input
                type="email"
                className="form-input"
                placeholder="stu004@ontime.college"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                className="form-input"
                placeholder="+91 9876543210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Initial Password (Optional)</label>
            <input
              type="password"
              className="form-input"
              placeholder="Default: Student@123"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <div className="modal-footer" style={{ padding: '1rem 0 0 0', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Enrolling...' : 'Enroll Student'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Student Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Student: ${selectedStudent?.student_code}`}
        maxWidth="600px"
      >
        <form onSubmit={handleEditSubmit}>
          {formError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 500 }}>
              {formError}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Register Number *</label>
              <input
                type="text"
                className="form-input"
                value={formData.registerNumber}
                onChange={(e) => setFormData({ ...formData, registerNumber: e.target.value.toUpperCase() })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Year *</label>
              <select
                className="form-select"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Department *</label>
            <select
              className="form-select"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            >
              <option value="Computer Science & Engineering">Computer Science & Engineering</option>
              <option value="Electronics & Communication">Electronics & Communication</option>
              <option value="Information Technology">Information Technology</option>
              <option value="Mechanical Engineering">Mechanical Engineering</option>
              <option value="Civil Engineering">Civil Engineering</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                type="email"
                className="form-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                type="tel"
                className="form-input"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer" style={{ padding: '1rem 0 0 0', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ID Card Barcode Preview Modal */}
      <Modal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        title="Student ID Barcode"
        maxWidth="400px"
      >
        {selectedStudent && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{selectedStudent.name}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {selectedStudent.department} • {selectedStudent.year}
              </p>
              <p style={{ fontFamily: 'monospace', color: 'var(--primary-400)', fontSize: '0.85rem' }}>
                Reg: {selectedStudent.register_number}
              </p>
            </div>

            <BarcodeRenderer value={selectedStudent.student_code} width={280} height={85} />

            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '1.25rem' }}>
              Present this barcode at the college gate for camera scanner verification.
            </p>
          </div>
        )}
      </Modal>

      {/* Delete Student Confirmation Modal */}
      <Modal
        isOpen={!!studentToDelete}
        onClose={() => !deleting && setStudentToDelete(null)}
        title="Confirm Student Deletion"
        maxWidth="460px"
      >
        {studentToDelete && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Are you sure you want to delete student <strong>{studentToDelete.name}</strong> ({studentToDelete.student_code})?
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                This will permanently remove the student from the Student Directory and safely remove all associated records.
              </p>
            </div>

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStudentToDelete(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmDelete}
                disabled={deleting}
                style={{ background: '#ef4444', borderColor: '#ef4444', color: '#fff' }}
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StudentsManagement;
