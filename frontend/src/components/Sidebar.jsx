import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Sliders,
  Clock,
  CreditCard,
  Settings,
  ScanLine,
  ClipboardList,
  User,
  Receipt,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { role } = useAuth();

  const adminNav = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Students', path: '/admin/students', icon: Users },
    { label: 'Fine Rules', path: '/admin/fine-rules', icon: Sliders },
    { label: 'Late Records', path: '/admin/late-records', icon: ClipboardList },
    { label: 'Payments Log', path: '/admin/payments', icon: CreditCard },
    { label: 'College Settings', path: '/admin/settings', icon: Settings },
  ];

  const staffNav = [
    { label: 'Dashboard', path: '/staff/dashboard', icon: LayoutDashboard },
    { label: 'ID Barcode Scanner', path: '/staff/scan', icon: ScanLine },
    { label: 'Late Records Log', path: '/staff/late-records', icon: ClipboardList },
  ];

  const studentNav = [
    { label: 'My Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { label: 'Student Profile & ID', path: '/student/profile', icon: User },
    { label: 'Pending Fines', path: '/student/fines', icon: AlertCircle },
    { label: 'Payment History', path: '/student/payments', icon: Receipt },
  ];

  let navItems = [];
  if (role === 'ADMIN') navItems = adminNav;
  else if (role === 'STAFF') navItems = staffNav;
  else if (role === 'STUDENT') navItems = studentNav;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 45
          }}
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Navigation Portal
          </span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div style={{
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)'
          }}>
            <div style={{ fontWeight: 600, color: '#fff', marginBottom: '0.2rem' }}>
              OnTime Attendance
            </div>
            <div>Automated Fine Engine v1.0</div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
