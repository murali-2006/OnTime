import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ScanLine,
  Clock,
  AlertTriangle,
  ClipboardList,
  CheckCircle2,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import api from '../../services/api';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';

const StaffDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStaffData = async () => {
    setLoading(true);
    try {
      // Fetch today's records
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await api.get('/late-records', { params: { date: todayStr } });
      if (res.success) {
        const records = res.records || [];
        const lateCount = records.filter(r => r.late_minutes > 0).length;
        const pendingFineSum = records
          .filter(r => r.status === 'PENDING')
          .reduce((sum, r) => sum + parseFloat(r.fine_amount || 0), 0);

        setData({
          totalScannedToday: records.length,
          totalLateToday: lateCount,
          pendingFineSum,
          recentScans: records.slice(0, 10)
        });
      }
    } catch (err) {
      console.error('Failed to load staff dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header & Primary Gate Action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Gate Attendance Officer Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Record student arrival times by scanning student ID card barcodes
          </p>
        </div>
        <Link to="/staff/scan" className="btn btn-primary btn-lg" style={{ boxShadow: '0 0 20px rgba(37,99,235,0.4)' }}>
          <ScanLine size={20} /> Open ID Barcode Scanner
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="dashboard-grid">
        <StatCard
          title="Today's Total Scans"
          value={data?.totalScannedToday ?? 0}
          icon={Clock}
          color="cyan"
          subtitle="Processed at entry gate"
        />
        <StatCard
          title="Today's Late Arrivals"
          value={data?.totalLateToday ?? 0}
          icon={AlertTriangle}
          color="amber"
          subtitle="Exceeded reporting time"
        />
        <StatCard
          title="Today's Fines Created"
          value={`₹${data?.pendingFineSum ? data.pendingFineSum.toFixed(2) : '0.00'}`}
          icon={ScanLine}
          color="purple"
          subtitle="Pending student payment"
        />
      </div>

      {/* Recent Scans Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Today's Scanned Students</h2>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Real-time feed of gate entries recorded today
            </p>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={fetchStaffData}>
            <RefreshCw size={14} /> Refresh
          </button>
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
                <th>Fine (₹)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    Loading today's records...
                  </td>
                </tr>
              ) : data?.recentScans && data.recentScans.length > 0 ? (
                data.recentScans.map((rec) => (
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
                      <span style={{ color: rec.late_minutes > 0 ? '#f59e0b' : '#10b981', fontWeight: 600 }}>
                        {rec.late_minutes > 0 ? `${rec.late_minutes} min late` : 'On Time'}
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
                    No students have been scanned yet today.
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

export default StaffDashboard;
