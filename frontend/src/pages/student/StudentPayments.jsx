import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Receipt,
  Search,
  CheckCircle2,
  Calendar,
  IndianRupee,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import api from '../../services/api';
import Badge from '../../components/Badge';

const StudentPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchPayments = async () => {
    setLoading(true);
    try {
      // In student portal, student fines endpoint returns paidFines with payment details
      const res = await api.get('/student/fines');
      if (res.success && res.paidFines) {
        setPayments(res.paidFines);
      }
    } catch (err) {
      console.error('Failed to load payment history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const filteredPayments = payments.filter((p) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      (p.transaction_id && p.transaction_id.toLowerCase().includes(term)) ||
      (p.date && p.date.includes(term))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Fine Payment History</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Verified transaction records and official payment receipts
          </p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={fetchPayments}>
          <RefreshCw size={15} /> Refresh History
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search size={18} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-input"
            style={{ width: '100%', paddingLeft: '2.5rem' }}
            placeholder="Search by transaction ID or date..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Payment Records Table */}
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Late Incident Date</th>
                <th>Late Duration</th>
                <th>Fine Amount</th>
                <th>Transaction ID</th>
                <th>Payment Date</th>
                <th>Payment Status</th>
                <th style={{ textAlign: 'right' }}>Official Receipt</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    Loading your payment transactions...
                  </td>
                </tr>
              ) : filteredPayments.length > 0 ? (
                filteredPayments.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.date ? p.date.split('T')[0] : ''}</td>
                    <td>{p.late_minutes} minutes</td>
                    <td style={{ fontWeight: 700, color: '#10b981', fontSize: '1rem' }}>
                      ₹{parseFloat(p.fine_amount).toFixed(2)}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.825rem', color: 'var(--primary-400)' }}>
                      {p.transaction_id || 'SUCCESS'}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {p.paid_at ? new Date(p.paid_at).toLocaleString() : 'Completed'}
                    </td>
                    <td>
                      <Badge status="PAID" />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        to={`/student/receipt/${p.payment_id || p.id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', gap: '0.4rem' }}
                      >
                        <Receipt size={14} /> View Receipt
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle2 size={30} color="#10b981" />
                      <span style={{ fontWeight: 600, color: '#fff' }}>No Payment Records Found</span>
                      <span style={{ fontSize: '0.85rem' }}>You have not made any fine payments yet.</span>
                    </div>
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

export default StudentPayments;
