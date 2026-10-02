import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Search,
  Filter,
  Calendar,
  Download,
  Clock,
  IndianRupee,
  RefreshCw
} from 'lucide-react';
import api from '../../services/api';
import Badge from '../../components/Badge';

const LateRecordsManagement = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (dateFilter) params.date = dateFilter;
      if (statusFilter) params.status = statusFilter;

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
  }, [search, dateFilter, statusFilter]);

  const handleExportCSV = () => {
    if (records.length === 0) return;
    const headers = ['Record ID', 'Date', 'Student Code', 'Student Name', 'Register No', 'Department', 'Reporting Time', 'Arrival Time', 'Late Minutes', 'Fine Amount', 'Status'];
    const rows = records.map(r => [
      r.id,
      r.date ? r.date.split('T')[0] : '',
      `"${r.student_code}"`,
      `"${r.student_name}"`,
      `"${r.register_number}"`,
      `"${r.department}"`,
      r.reporting_time,
      r.arrival_time,
      r.late_minutes,
      r.fine_amount,
      r.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ontime_late_records_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Late Arrival Records Audit Log</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Historical record of all scanned student gate entries and fine liabilities
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={fetchRecords}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleExportCSV} disabled={records.length === 0}>
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
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

          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="PAID">PAID</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Student</th>
                <th>Register No.</th>
                <th>Department</th>
                <th>Reporting</th>
                <th>Arrival</th>
                <th>Late By</th>
                <th>Fine</th>
                <th>Status</th>
                <th>Staff Officer</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    Loading late records...
                  </td>
                </tr>
              ) : records.length > 0 ? (
                records.map((r) => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {r.date ? r.date.split('T')[0] : ''}
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600 }}>{r.student_name}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--primary-400)' }}>
                          {r.student_code}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {r.register_number}
                    </td>
                    <td>{r.department}</td>
                    <td style={{ fontFamily: 'monospace' }}>{r.reporting_time}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.arrival_time}</td>
                    <td>
                      <span style={{ color: r.late_minutes > 0 ? '#f59e0b' : '#10b981', fontWeight: 600 }}>
                        {r.late_minutes > 0 ? `${r.late_minutes} min` : 'On Time'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#fff' }}>
                      ₹{parseFloat(r.fine_amount).toFixed(2)}
                    </td>
                    <td>
                      <Badge status={r.status} />
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {r.staff_name || 'System Gate'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                    No late records found matching your filters.
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

export default LateRecordsManagement;
