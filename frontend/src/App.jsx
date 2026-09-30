import React, { useState } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';

// Public Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import StudentsManagement from './pages/admin/StudentsManagement';
import FineRulesManagement from './pages/admin/FineRulesManagement';
import LateRecordsManagement from './pages/admin/LateRecordsManagement';
import PaymentsManagement from './pages/admin/PaymentsManagement';
import SettingsPage from './pages/admin/SettingsPage';

// Staff Pages
import StaffDashboard from './pages/staff/StaffDashboard';
import ScanPage from './pages/staff/ScanPage';
import StaffLateRecords from './pages/staff/StaffLateRecords';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentProfile from './pages/student/StudentProfile';
import StudentFines from './pages/student/StudentFines';
import StudentPayments from './pages/student/StudentPayments';
import PaymentReceipt from './pages/student/PaymentReceipt';

/**
 * Layout wrapper for authenticated portals (Admin, Staff, Student)
 */
const PortalLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="content-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* ADMIN Protected Routes */}
      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route element={<PortalLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/students" element={<StudentsManagement />} />
          <Route path="/admin/fine-rules" element={<FineRulesManagement />} />
          <Route path="/admin/late-records" element={<LateRecordsManagement />} />
          <Route path="/admin/payments" element={<PaymentsManagement />} />
          <Route path="/admin/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* STAFF Protected Routes */}
      <Route element={<ProtectedRoute allowedRoles={['STAFF']} />}>
        <Route element={<PortalLayout />}>
          <Route path="/staff/dashboard" element={<StaffDashboard />} />
          <Route path="/staff/scan" element={<ScanPage />} />
          <Route path="/staff/late-records" element={<StaffLateRecords />} />
        </Route>
      </Route>

      {/* STUDENT Protected Routes */}
      <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
        <Route element={<PortalLayout />}>
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/profile" element={<StudentProfile />} />
          <Route path="/student/fines" element={<StudentFines />} />
          <Route path="/student/payments" element={<StudentPayments />} />
          <Route path="/student/receipt/:id" element={<PaymentReceipt />} />
        </Route>
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
