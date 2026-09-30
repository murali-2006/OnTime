import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  CheckCircle2,
  Calendar,
  IndianRupee,
  RefreshCw
} from 'lucide-react';
import api from '../../services/api';
import Badge from '../../components/Badge';

const PaymentsManagement = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/admin/payments', { params });
      if (res.success) {
        setPayments(res.payments);
      }
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [search, statusFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Payment Transactions Audit</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Complete ledger of verified student fine online payments
          </p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={fetchPayments}>
          <RefreshCw size={15} /> Refresh Transactions
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-input"
              style={{ width: '100%', paddingLeft: '2.5rem' }}
              placeholder="Search transaction ID, student..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Payment Statuses</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="CREATED">CREATED</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Student</th>
                <th>Register No.</th>
                <th>Late Date</th>
                <th>Late By</th>
                <th>Amount Paid</th>
                <th>Gateway</th>
                <th>Payment Status</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    Loading payment records...
                  </td>
                </tr>
              ) : payments.length > 0 ? (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary-400)' }}>
                      {p.transaction_id || p.gateway_order_id || 'PENDING'}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.student_name}</div>
                      <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {p.student_code}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {p.register_number}
                    </td>
                    <td>{p.late_date ? p.late_date.split('T')[0] : ''}</td>
                    <td>{p.late_minutes} min</td>
                    <td style={{ fontWeight: 700, color: '#10b981', fontSize: '1rem' }}>
                      ₹{parseFloat(p.amount).toFixed(2)}
                    </td>
                    <td>
                      <span className="brand-badge" style={{ fontSize: '0.65rem', background: 'var(--bg-input)' }}>
                        {p.payment_gateway}
                      </span>
                    </td>
                    <td>
                      <Badge status={p.status} />
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {p.paid_at ? new Date(p.paid_at).toLocaleString() : new Date(p.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                    No payment records found.
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

export default PaymentsManagement;
