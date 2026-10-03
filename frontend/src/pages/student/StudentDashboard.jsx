import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  AlertTriangle,
  CreditCard,
  IndianRupee,
  ScanBarcode as BarcodeIcon,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Receipt
} from 'lucide-react';
import api from '../../services/api';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import BarcodeRenderer from '../../components/BarcodeRenderer';
import { formatISTTime } from '../../utils/timeUtils';

const StudentDashboard = () => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStudentProfile = async () => {
      setLoading(true);
      try {
        const res = await api.get('/student/profile');
        if (res.success) {
          setProfileData(res);
        }
      } catch (err) {
        setError(err.message || 'Failed to load student profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchStudentProfile();
  }, []);

  const student = profileData?.student;
  const stats = profileData?.stats;
  const todayRecord = profileData?.todayRecord;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>
            Welcome back, {student?.name || 'Student'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {student?.department} • Year: {student?.year} • ID: <strong style={{ color: 'var(--primary-400)' }}>{student?.student_code}</strong>
          </p>
        </div>

        <Link to="/student/profile" className="btn btn-secondary btn-sm">
          <BarcodeIcon size={16} /> View Digital ID Card
        </Link>
      </div>

      {error && (
        <div className="card" style={{ borderLeft: '4px solid var(--status-failed)', color: '#b91c1c', background: '#fef2f2' }}>
          {error}
        </div>
      )}

      {/* Today's Arrival Status Alert */}
      <div
        className="card"
        style={{
          border: todayRecord
            ? todayRecord.late_minutes > 0
              ? '1px solid rgba(245, 158, 11, 0.4)'
              : '1px solid rgba(16, 185, 129, 0.4)'
            : '1px solid var(--border-subtle)',
          background: todayRecord
            ? todayRecord.late_minutes > 0
              ? 'rgba(245, 158, 11, 0.05)'
              : 'rgba(16, 185, 129, 0.05)'
            : 'var(--bg-card)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: todayRecord
                ? todayRecord.late_minutes > 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'
                : 'var(--bg-input)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Clock size={22} color={todayRecord ? todayRecord.late_minutes > 0 ? '#f59e0b' : '#10b981' : 'var(--text-muted)'} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '0.2rem' }}>
                Today's Gate Arrival Status
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {todayRecord ? (
                  todayRecord.late_minutes > 0 ? (
                    <span>
                      Arrived at <strong style={{ color: 'var(--text-main)' }}>{formatISTTime(todayRecord.arrival_time)}</strong> — Late by <strong style={{ color: '#f59e0b' }}>{todayRecord.late_minutes} minutes</strong> (Fine: ₹{parseFloat(todayRecord.fine_amount).toFixed(2)})
                    </span>
                  ) : (
                    <span>Arrived on time at <strong style={{ color: '#10b981' }}>{formatISTTime(todayRecord.arrival_time)}</strong>. No fine applied.</span>
                  )
                ) : (
                  'No gate scan recorded for today yet. Scan your ID barcode at the college gate.'
                )}
              </p>
            </div>
          </div>

          {todayRecord && todayRecord.status === 'PENDING' && (
            <Link to="/student/fines" className="btn btn-primary btn-sm">
              Pay ₹{parseFloat(todayRecord.fine_amount).toFixed(2)} Fine Now <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="dashboard-grid">
        <StatCard
          title="Pending Fines"
          value={`₹${stats?.pendingFinesSum ? stats.pendingFinesSum.toFixed(2) : '0.00'}`}
          icon={AlertTriangle}
          color="amber"
          subtitle={`${stats?.pendingFinesCount ?? 0} fine(s) awaiting payment`}
        />
        <StatCard
          title="Total Late Incidents"
          value={stats?.totalLateCount ?? 0}
          icon={Clock}
          color="purple"
          subtitle="All-time late records"
        />
        <StatCard
          title="Paid Fines Total"
          value={`₹${stats?.paidFinesSum ? stats.paidFinesSum.toFixed(2) : '0.00'}`}
          icon={CheckCircle2}
          color="emerald"
          subtitle="Successfully cleared"
        />
      </div>

      {/* Quick Navigation Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <IndianRupee size={18} color="#f59e0b" /> Pending Fines Portal
            </h3>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Review pending late fine charges and settle them securely via the online payment gateway.
          </p>
          <Link to="/student/fines" className="btn btn-primary btn-sm">
            View & Pay Pending Fines <ArrowRight size={14} />
          </Link>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Receipt size={18} color="#10b981" /> Receipts & History
            </h3>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Access and download printable payment receipts and historical gate arrival timestamps.
          </p>
          <Link to="/student/payments" className="btn btn-secondary btn-sm">
            View Payment History <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
