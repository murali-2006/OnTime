import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Clock,
  ScanLine,
  ShieldCheck,
  CreditCard,
  FileCheck,
  ArrowRight,
  CheckCircle,
  Users,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LandingPage = () => {
  const { isAuthenticated, role, login } = useAuth();
  const navigate = useNavigate();

  const handleQuickLogin = async (email, password) => {
    try {
      const user = await login(email, password);
      if (user.role === 'ADMIN') navigate('/admin/dashboard');
      else if (user.role === 'STAFF') navigate('/staff/dashboard');
      else if (user.role === 'STUDENT') navigate('/student/dashboard');
    } catch (err) {
      navigate('/login');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      {/* Top Banner Navigation */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--primary-600), var(--accent-cyan))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Clock size={20} color="#fff" />
          </div>
          <span>ON<span style={{ color: 'var(--primary-500)' }}>TIME</span></span>
        </div>

        <div className="navbar-actions">
          {isAuthenticated ? (
            <Link
              to={role === 'ADMIN' ? '/admin/dashboard' : role === 'STAFF' ? '/staff/dashboard' : '/student/dashboard'}
              className="btn btn-primary btn-sm"
            >
              Go to {role} Dashboard <ArrowRight size={16} />
            </Link>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              Sign In to Portal <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ padding: '4rem 2rem 3rem 2rem', maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 1rem',
          borderRadius: '9999px',
          background: 'rgba(37, 99, 235, 0.1)',
          border: '1px solid rgba(37, 99, 235, 0.3)',
          color: 'var(--primary-200)',
          fontSize: '0.85rem',
          fontWeight: 600,
          marginBottom: '1.5rem'
        }}>
          <ShieldCheck size={16} color="var(--primary-500)" /> College Attendance & Automated Late Fine Infrastructure
        </div>

        <h1 style={{
          fontSize: 'clamp(2.4rem, 5vw, 4rem)',
          fontWeight: 800,
          lineHeight: 1.15,
          marginBottom: '1.25rem',
          background: 'linear-gradient(180deg, #ffffff 0%, #94a3b8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Campus Late-Arrival Tracking & Fine Management Made Effortless
        </h1>

        <p style={{
          fontSize: '1.15rem',
          color: 'var(--text-muted)',
          maxWidth: '750px',
          margin: '0 auto 2.5rem auto'
        }}>
          Seamlessly scan student ID card barcodes at college entry gates, calculate late duration against admin reporting times, generate rules-based fines instantly, and accept online verified payments.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '3.5rem' }}>
          <Link to="/login" className="btn btn-primary btn-lg">
            Enter Campus Portal <ArrowRight size={18} />
          </Link>
          <a href="#demo-accounts" className="btn btn-secondary btn-lg">
            View Demo Credentials
          </a>
        </div>

        {/* Workflow Steps */}
        <div className="card" style={{ padding: '2.5rem 1.5rem', background: 'var(--bg-card)', marginBottom: '3.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>How OnTime Works</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', textAlign: 'left' }}>
            <div style={{ background: 'var(--bg-input)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ color: 'var(--primary-500)', fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.5rem' }}>01</div>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.4rem' }}>Gate Barcode Scan</h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Staff scans the student ID barcode using a laptop or phone camera.</p>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.5rem' }}>02</div>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.4rem' }}>Server Calculation</h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Backend compares current server time against reporting time & dynamic fine rules.</p>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ color: '#10b981', fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.5rem' }}>03</div>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.4rem' }}>Staff Confirmation</h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Staff confirms student entry. Record is locked and duplicate scans prevented.</p>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ color: '#a855f7', fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.5rem' }}>04</div>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.4rem' }}>Online Payment & Receipt</h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Student logs in, pays fine online, backend verifies signature, and issues formal receipt.</p>
            </div>
          </div>
        </div>

        {/* Demo Credentials Quick-Access Box */}
        <div id="demo-accounts" className="card" style={{ border: '1px solid rgba(59, 130, 246, 0.4)', background: 'linear-gradient(180deg, #111827 0%, #172033 100%)' }}>
          <h2 style={{ fontSize: '1.35rem', marginBottom: '0.5rem' }}>🚀 Quick Demo & Evaluation Accounts</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Click any button below to instantly sign in with pre-seeded demo roles:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {/* Admin */}
            <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-subtle)', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 700, color: '#fff' }}>College Administrator</span>
                <span className="badge badge-active">ADMIN</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                <div>Email: <strong style={{ color: '#fff' }}>admin@ontime.college</strong></div>
                <div>Pass: <strong style={{ color: '#fff' }}>Admin@123</strong></div>
                <div style={{ marginTop: '0.35rem' }}>Controls reporting time, rules, student directory, & payment audits.</div>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm btn-full"
                onClick={() => handleQuickLogin('admin@ontime.college', 'Admin@123')}
              >
                Sign in as Admin
              </button>
            </div>

            {/* Staff */}
            <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-subtle)', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 700, color: '#fff' }}>Attendance Staff</span>
                <span className="badge badge-waived">STAFF</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                <div>Email: <strong style={{ color: '#fff' }}>staff@ontime.college</strong></div>
                <div>Pass: <strong style={{ color: '#fff' }}>Staff@123</strong></div>
                <div style={{ marginTop: '0.35rem' }}>Operates camera barcode scanner at gate to log student arrivals.</div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm btn-full"
                onClick={() => handleQuickLogin('staff@ontime.college', 'Staff@123')}
              >
                Sign in as Staff
              </button>
            </div>

            {/* Student */}
            <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-subtle)', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 700, color: '#fff' }}>Student (John Doe)</span>
                <span className="badge badge-paid">STUDENT</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                <div>Email: <strong style={{ color: '#fff' }}>stu001@ontime.college</strong></div>
                <div>Pass: <strong style={{ color: '#fff' }}>Student@123</strong></div>
                <div style={{ marginTop: '0.35rem' }}>Barcode ID: <strong style={{ color: 'var(--accent-cyan)' }}>STU001</strong>. Views fines & pays online.</div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm btn-full"
                onClick={() => handleQuickLogin('stu001@ontime.college', 'Student@123')}
              >
                Sign in as Student
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '2rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
        © 2026 OnTime College Late-Arrival & Fine Management System. Built with React, Node.js & PostgreSQL.
      </footer>
    </div>
  );
};

export default LandingPage;
