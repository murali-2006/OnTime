import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Calendar,
  Search,
  RefreshCw
} from 'lucide-react';
import api from '../../services/api';
import Badge from '../../components/Badge';

const StaffLateRecords = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFilter) params.date = dateFilter;
      if (search) params.search = search;

      const res = await api.get('/late-records', { params });
      if (res.success) {
        setRecords(res.records);
      }
    } catch (err) {
      console.error('Failed to load late records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [dateFilter, search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Late Attendance Log</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Review scanned gate arrivals and calculated fine records
          </p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={fetchRecords}>
          <RefreshCw size={15} /> Refresh Log
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-input"
              style={{ width: '100%', paddingLeft: '2.5rem' }}
              placeholder="Search student name, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Calendar size={18} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="date"
              className="form-input"
              style={{ width: '100%', paddingLeft: '2.5rem' }}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Student Code</th>
                <th>Student Name</th>
                <th>Register No.</th>
                <th>Department</th>
                <th>Reporting</th>
                <th>Arrival</th>
                <th>Late Duration</th>
                <th>Fine</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    Loading records...
                  </td>
                </tr>
              ) : records.length > 0 ? (
                records.map((r) => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{r.date ? r.date.split('T')[0] : ''}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary-400)' }}>
                      {r.student_code}
                    </td>
                    <td style={{ fontWeight: 600 }}>{r.student_name}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{r.register_number}</td>
                    <td>{r.department}</td>
                    <td style={{ fontFamily: 'monospace' }}>{r.reporting_time}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.arrival_time}</td>
                    <td>
                      <span style={{ color: r.late_minutes > 0 ? '#f59e0b' : '#10b981', fontWeight: 600 }}>
                        {r.late_minutes > 0 ? `${r.late_minutes} min late` : 'On Time'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#fff' }}>
                      ₹{parseFloat(r.fine_amount).toFixed(2)}
                    </td>
                    <td>
                      <Badge status={r.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                    No late records found.
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

export default StaffLateRecords;
