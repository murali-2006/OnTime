import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Clock,
  AlertTriangle,
  CreditCard,
  IndianRupee,
  Sliders,
  Settings,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import api from '../../services/api';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/dashboard');
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Administrator Overview</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Live attendance monitoring, late arrival statistics, and fine collections
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={fetchDashboardData}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh Data
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderLeft: '4px solid var(--status-failed)', color: '#fca5a5' }}>
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="dashboard-grid">
        <StatCard
          title="Total Active Students"
          value={data?.stats?.totalStudents ?? 0}
          icon={Users}
          color="blue"
          subtitle="Enrolled in system"
        />
        <StatCard
          title="Today's Scanned"
          value={data?.stats?.todayScans ?? 0}
          icon={Clock}
          color="cyan"
          subtitle="Arrivals recorded today"
        />
        <StatCard
          title="Today's Late Students"
          value={data?.stats?.todayLateStudents ?? 0}
          icon={AlertTriangle}
          color="amber"
          subtitle="Exceeded reporting time"
        />
        <StatCard
          title="Pending Fines"
          value={`₹${data?.stats?.pendingFinesAmount ?? 0}`}
          icon={IndianRupee}
          color="purple"
          subtitle={`${data?.stats?.pendingFinesCount ?? 0} unpaid records`}
        />
        <StatCard
          title="Today's Collection"
          value={`₹${data?.stats?.todayCollection ?? 0}`}
          icon={CreditCard}
          color="emerald"
          subtitle={`All-time: ₹${data?.stats?.allTimeCollection ?? 0}`}
        />
      </div>

      {/* Quick Action Navigation Shortcuts */}
      <div className="card" style={{ background: 'var(--bg-input)', padding: '1.25rem' }}>
        <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
          ADMINISTRATIVE CONTROLS
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          <Link to="/admin/students" className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={16} color="var(--primary-500)" /> Student Directory
            </span>
            <ChevronRight size={16} />
          </Link>

          <Link to="/admin/fine-rules" className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sliders size={16} color="var(--accent-purple)" /> Configure Fine Rules
            </span>
            <ChevronRight size={16} />
          </Link>

          <Link to="/admin/settings" className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={16} color="var(--accent-cyan)" /> Reporting Time Settings
            </span>
            <ChevronRight size={16} />
          </Link>

          <Link to="/admin/late-records" className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={16} color="#f59e0b" /> View All Late Records
            </span>
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      {/* Today's Late Students Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Today's Late Students</h2>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Live real-time feed of students arriving after college reporting time
            </p>
          </div>
          <Link to="/admin/late-records" className="btn btn-secondary btn-sm">
            View All History
          </Link>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Student Code</th>
                <th>Student Name</th>
                <th>Register No.</th>
                <th>Department</th>
                <th>Arrival Time</th>
                <th>Late Duration</th>
                <th>Fine Amount</th>
                <th>Fine Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.recentLateStudents && data.recentLateStudents.length > 0 ? (
                data.recentLateStudents.map((rec) => (
                  <tr key={rec.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary-400)' }}>
                      {rec.student_code}
                    </td>
                    <td style={{ fontWeight: 600 }}>{rec.student_name}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {rec.register_number}
                    </td>
                    <td>{rec.department}</td>
                    <td style={{ fontFamily: 'monospace' }}>{rec.arrival_time}</td>
                    <td>
                      <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                        {rec.late_minutes} min late
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#fff' }}>
                      ₹{parseFloat(rec.fine_amount).toFixed(2)}
                    </td>
                    <td>
                      <Badge status={rec.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                    No late arrival records found for today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
