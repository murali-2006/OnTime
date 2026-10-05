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
import { formatISTDateTime } from '../../utils/timeUtils';

const PaymentsManagement = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      const res = await api.get('/admin/payments', { params });
      if (res.success && Array.isArray(res.payments)) {
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
            Complete audit ledger of student fine payment records
          </p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={fetchPayments}>
          <RefreshCw size={15} /> Refresh Transactions
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'center' }}>
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
            <option value="PENDING">PENDING</option>
            <option value="PAID">PAID</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
      </div>

      {/* Payments Records */}
      <div className="card">
        {/* Desktop Table View */}
        <div className="table-container desktop-only-table">
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
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary-400)', fontSize: '0.825rem' }}>
                      {p.transaction_id || (p.paymentId || p.id ? `DEMO-TXN-${p.paymentId || p.id}` : 'N/A')}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.student_name || p.studentName || 'Student'}</div>
                      <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {p.student_code || p.studentCode || ''}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {p.register_number || p.registerNumber || '—'}
                    </td>
                    <td>{p.late_date ? p.late_date.split('T')[0] : (p.date ? p.date.split('T')[0] : '—')}</td>
                    <td>{p.late_minutes !== undefined && p.late_minutes !== null ? `${p.late_minutes} min` : '—'}</td>
                    <td style={{ fontWeight: 700, color: '#10b981', fontSize: '1rem' }}>
                      ₹{parseFloat(p.amount || p.fineAmount || 0).toFixed(2)}
                    </td>
                    <td>
                      <span className="brand-badge" style={{ fontSize: '0.65rem', background: 'var(--bg-input)' }}>
                        {p.payment_gateway || 'DEMO_QR'}
                      </span>
                    </td>
                    <td>
                      <Badge status={p.status} />
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {formatISTDateTime(p.paid_at || p.verifiedAt || p.submittedAt || p.created_at)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle2 size={32} color="var(--primary-400)" />
                      <span style={{ fontWeight: 600, color: '#fff' }}>No Payment Records Found</span>
                      <span style={{ fontSize: '0.85rem' }}>Payments submitted by students will appear in this audit ledger.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="mobile-cards-container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              Loading payment records...
            </div>
          ) : payments.length > 0 ? (
            payments.map((p) => (
              <div key={p.id} className="mobile-item-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                      {p.student_name || p.studentName || 'Student'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {p.student_code || p.studentCode} • {p.register_number || p.registerNumber || 'N/A'}
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--primary-400)', marginTop: '0.2rem' }}>
                      Txn: {p.transaction_id || (p.paymentId || p.id ? `DEMO-TXN-${p.paymentId || p.id}` : 'N/A')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#10b981' }}>
                      ₹{parseFloat(p.amount || p.fineAmount || 0).toFixed(2)}
                    </div>
                    <div style={{ marginTop: '0.35rem' }}>
                      <Badge status={p.status} />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.65rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span>Late: {p.late_date ? p.late_date.split('T')[0] : '—'} ({p.late_minutes || 0} min)</span>
                  <span>{formatISTDateTime(p.paid_at || p.verifiedAt || p.submittedAt || p.created_at)}</span>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
              <CheckCircle2 size={28} color="var(--primary-400)" style={{ margin: '0 auto 0.5rem auto' }} />
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>No Payment Records Found</div>
              <div style={{ fontSize: '0.8rem' }}>Payments submitted by students will appear in this audit ledger.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentsManagement;
