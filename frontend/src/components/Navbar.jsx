import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, LogOut, Menu, User, Shield, CreditCard, ScanLine } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ onToggleSidebar }) => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleDisplayName = (r) => {
    switch (r) {
      case 'ADMIN': return 'Administrator';
      case 'STAFF': return 'Attendance Staff';
      case 'STUDENT': return 'Student';
      default: return r;
    }
  };

  return (
    <header className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {onToggleSidebar && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onToggleSidebar}
            style={{ display: 'inline-flex', padding: '0.4rem', border: 'none' }}
            title="Toggle Menu"
          >
            <Menu size={20} />
          </button>
        )}

        <Link to="/" className="navbar-brand">
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--primary-600), var(--accent-cyan))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 12px rgba(37,99,235,0.4)'
          }}>
            <Clock size={20} color="#fff" />
          </div>
          <span>ON<span style={{ color: 'var(--primary-500)' }}>TIME</span></span>
          <span className="brand-badge">{role || 'System'}</span>
        </Link>
      </div>

      <div className="navbar-actions">
        {user ? (
          <>
            <div className="user-profile-badge">
              <div className="user-avatar">
                {user.email ? user.email[0].toUpperCase() : 'U'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.85rem' }}>
                  {user.profile?.name || user.email.split('@')[0]}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {getRoleDisplayName(role)}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleLogout}
              title="Sign Out"
            >
              <LogOut size={16} />
              <span style={{ display: 'none', md: 'inline' }}>Sign Out</span>
            </button>
          </>
        ) : (
          <Link to="/login" className="btn btn-primary btn-sm">
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
};

export default Navbar;
