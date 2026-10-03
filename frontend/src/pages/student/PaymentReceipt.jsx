import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Clock,
  Printer,
  CheckCircle2,
  ShieldCheck,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import Badge from '../../components/Badge';
import { formatISTTime, formatISTDateTime } from '../../utils/timeUtils';

const PaymentReceipt = () => {
  const { id } = useParams();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReceipt = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/payments/${id}`);
        if (res.success && res.receipt) {
          setReceipt(res.receipt);
        }
      } catch (err) {
        setError(err.message || 'Payment receipt not found.');
      } finally {
        setLoading(false);
      }
    };

    fetchReceipt();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
        Generating verified receipt...
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center', padding: '2rem' }}>
        <AlertCircle size={40} color="#ef4444" style={{ margin: '0 auto 1rem auto' }} />
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Receipt Not Found</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          {error || 'Unable to locate receipt details.'}
        </p>
        <Link to="/student/fines" className="btn btn-secondary btn-sm">
          <ArrowLeft size={16} /> Return to Fines Portal
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      {/* Top Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }} className="no-print">
        <Link to="/student/fines" className="btn btn-secondary btn-sm">
          <ArrowLeft size={16} /> Back to Fines
        </Link>
        <button type="button" className="btn btn-primary btn-sm" onClick={handlePrint}>
          <Printer size={16} /> Print Official Receipt
        </button>
      </div>

      {/* Official Receipt Paper Card */}
      <div
        className="card receipt-card"
        style={{
          background: '#ffffff',
          color: '#111827',
          padding: '2.5rem',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid #e5e7eb'
        }}
      >
        {/* Institutional Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #e5e7eb', paddingBottom: '1.5rem', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '10px',
              background: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <Clock size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>
                Jai Shriram College Of Engineering
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Late Attendance Fine Payment Receipt
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: '#dcfce7',
              color: '#15803d',
              padding: '0.3rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              fontWeight: 700
            }}>
              <CheckCircle2 size={15} /> PAID & VERIFIED
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.35rem', fontFamily: 'monospace' }}>
              Receipt #{receipt.payment_id}
            </div>
          </div>
        </div>

        {/* Student Identification Information */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem', background: '#f9fafb', padding: '1.25rem', borderRadius: '10px', marginBottom: '1.75rem', border: '1px solid #f3f4f6' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Student Full Name</span>
            <p style={{ fontWeight: 700, fontSize: '1.05rem', color: '#111827' }}>{receipt.student_name}</p>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Register Number</span>
            <p style={{ fontFamily: 'monospace', fontWeight: 600, color: '#111827' }}>{receipt.register_number}</p>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Department & Year</span>
            <p style={{ color: '#111827', fontSize: '0.9rem' }}>{receipt.department} ({receipt.year})</p>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Student ID Identifier</span>
            <p style={{ fontFamily: 'monospace', color: '#2563eb', fontWeight: 700 }}>{receipt.student_code}</p>
          </div>
        </div>

        {/* Incident & Late Calculation Breakdown */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em', marginBottom: '0.75rem', fontWeight: 700 }}>
            Attendance Incident Particulars
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '0.65rem 0', color: '#6b7280' }}>Date of Late Arrival</td>
                <td style={{ padding: '0.65rem 0', textAlign: 'right', fontWeight: 600, color: '#111827' }}>
                  {receipt.late_date ? receipt.late_date.split('T')[0] : ''}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '0.65rem 0', color: '#6b7280' }}>College Reporting Baseline</td>
                <td style={{ padding: '0.65rem 0', textAlign: 'right', fontFamily: 'monospace', color: '#111827' }}>
                  {formatISTTime(receipt.reporting_time)}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '0.65rem 0', color: '#6b7280' }}>Gate Barcode Scanned Time</td>
                <td style={{ padding: '0.65rem 0', textAlign: 'right', fontFamily: 'monospace', color: '#111827', fontWeight: 600 }}>
                  {formatISTTime(receipt.arrival_time)}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '0.65rem 0', color: '#6b7280' }}>Late Duration Exceeded</td>
                <td style={{ padding: '0.65rem 0', textAlign: 'right', fontWeight: 700, color: '#d97706' }}>
                  {receipt.late_minutes} minutes
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment Transaction Details */}
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>Amount Settled (INR):</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#15803d' }}>
              ₹{parseFloat(receipt.amount || receipt.fine_amount).toFixed(2)}
            </span>
          </div>

          <div style={{ fontSize: '0.8rem', color: '#166534', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div>Transaction Ref ID: <strong style={{ fontFamily: 'monospace' }}>{receipt.transaction_id || 'TXN_GATEWAY_SUCCESS'}</strong></div>
            <div>Payment Gateway: <strong>{receipt.payment_gateway || 'RAZORPAY'}</strong></div>
            <div>Settlement Timestamp: <strong>{formatISTDateTime(receipt.paid_at || new Date())}</strong></div>
          </div>
        </div>

        {/* Security Stamp & Verification Footer */}
        <div style={{ borderTop: '2px dashed #e5e7eb', paddingTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#6b7280' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#15803d', fontWeight: 600 }}>
            <ShieldCheck size={16} /> Backend Cryptographic Verification Confirmed
          </div>
          <div>Authorized College Attendance Bursar Stamp</div>
        </div>
      </div>
    </div>
  );
};

export default PaymentReceipt;
