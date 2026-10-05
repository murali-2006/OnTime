import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  IndianRupee,
  Clock,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Receipt,
  ShieldCheck,
  Lock,
  ArrowRight,
  QrCode
} from 'lucide-react';
import api from '../../services/api';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import Toast from '../../components/Toast';
import DummyQRCode from '../../components/DummyQRCode';
import { formatISTTime, formatISTDateTime } from '../../utils/timeUtils';

const StudentFines = () => {
  const [pendingFines, setPendingFines] = useState([]);
  const [paidFines, setPaidFines] = useState([]);
  const [loading, setLoading] = useState(true);

  // Payment Checkout Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedFine, setSelectedFine] = useState(null);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);
  const [paymentError, setPaymentError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchFines = async () => {
    setLoading(true);
    try {
      const res = await api.get('/student/fines');
      if (res.success) {
        setPendingFines(res.pendingFines || []);
        setPaidFines(res.paidFines || []);
      }
    } catch (err) {
      setToastMessage({ message: err.message || 'Failed to fetch fine records.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFines();
  }, []);

  // 1. Initiate Payment Order
  const handleInitiatePayment = async (fine) => {
    setSelectedFine(fine);
    setPaymentError(null);
    setPaymentSuccessData(null);
    setProcessingPayment(true);
    setIsPaymentModalOpen(true);

    try {
      const res = await api.post('/payments/create', { lateRecordId: fine.id });
      if (res.success && res.order) {
        setPaymentOrder(res.order);
      }
    } catch (err) {
      setPaymentError(err.message || 'Unable to initiate payment gateway order.');
    } finally {
      setProcessingPayment(false);
    }
  };

  // 2. Authorize and Complete Verified Payment
  const handleCompletePayment = async () => {
    if (!paymentOrder || !selectedFine) return;
    setProcessingPayment(true);
    setPaymentError(null);

    try {
      // In production Razorpay flow, the Razorpay modal popups and returns { razorpay_order_id, razorpay_payment_id, razorpay_signature }
      // In sandbox/test mode, the test order includes valid signed test tokens
      const paymentId = paymentOrder.testCredentials
        ? paymentOrder.testCredentials.mockPaymentId
        : `pay_${Date.now()}`;
      const signature = paymentOrder.testCredentials
        ? paymentOrder.testCredentials.testSignature
        : 'sig_mock_signature';

      // Backend verification is mandatory:
      const verifyRes = await api.post('/payments/verify', {
        lateRecordId: selectedFine.id,
        orderId: paymentOrder.orderId,
        paymentId,
        signature
      });

      if (verifyRes.success) {
        setPaymentSuccessData(verifyRes);
        setToastMessage({ message: 'Payment verified and confirmed!', type: 'success' });
        fetchFines(); // Refresh both lists
      }
    } catch (err) {
      setPaymentError(err.message || 'Payment verification failed.');
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {toastMessage && (
        <div className="toast-container">
          <Toast
            message={toastMessage.message}
            type={toastMessage.type}
            onClose={() => setToastMessage(null)}
          />
        </div>
      )}

      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Student Fines & Settlements</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Review pending late arrival fines, complete online settlement, and generate payment receipts
        </p>
      </div>

      {/* Pending Fines Section */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <IndianRupee size={20} color="#f59e0b" /> Pending Late Fines Awaiting Payment
          </h2>
          <span className="badge badge-pending">
            {pendingFines.length} Pending
          </span>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Late Date</th>
                <th>Reporting Time</th>
                <th>Arrival Time</th>
                <th>Late Duration</th>
                <th>Fine Amount</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    Loading fines...
                  </td>
                </tr>
              ) : pendingFines.length > 0 ? (
                pendingFines.map((fine) => (
                  <tr key={fine.id}>
                    <td style={{ fontWeight: 600 }}>{fine.date ? fine.date.split('T')[0] : ''}</td>
                    <td style={{ fontFamily: 'monospace' }}>{formatISTTime(fine.reporting_time)}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{formatISTTime(fine.arrival_time)}</td>
                    <td>
                      <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                        {fine.late_minutes} minutes
                      </span>
                    </td>
                    <td style={{ fontWeight: 800, fontSize: '1.1rem', color: '#ef4444' }}>
                      ₹{parseFloat(fine.fine_amount).toFixed(2)}
                    </td>
                    <td>
                      <Badge status={fine.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleInitiatePayment(fine)}
                      >
                        <CreditCard size={14} /> Pay Now
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle2 size={32} color="#10b981" />
                      <span style={{ fontWeight: 600, color: '#fff' }}>No Pending Fines</span>
                      <span style={{ fontSize: '0.85rem' }}>Your attendance fine account is fully settled!</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paid Fines History Section */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={20} color="#10b981" /> Settled Fines History
          </h2>
          <span className="badge badge-paid">
            {paidFines.length} Paid
          </span>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Late Duration</th>
                <th>Amount Paid</th>
                <th>Transaction ID</th>
                <th>Payment Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Loading history...
                  </td>
                </tr>
              ) : paidFines.length > 0 ? (
                paidFines.map((paid) => (
                  <tr key={paid.id}>
                    <td>{paid.date ? paid.date.split('T')[0] : ''}</td>
                    <td>{paid.late_minutes} min late</td>
                    <td style={{ fontWeight: 700, color: '#10b981' }}>
                      ₹{parseFloat(paid.fine_amount).toFixed(2)}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {paid.transaction_id || 'VERIFIED'}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {paid.paid_at ? formatISTDateTime(paid.paid_at) : 'Paid'}
                    </td>
                    <td>
                      <Badge status="PAID" />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        to={`/student/receipt/${paid.payment_id || paid.id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', gap: '0.35rem' }}
                      >
                        <Receipt size={14} /> View Receipt
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-dim)' }}>
                    No payment history recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Online Payment Gateway Checkout Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => !processingPayment && setIsPaymentModalOpen(false)}
        title="College Late Fine Online Payment"
        maxWidth="500px"
      >
        <div>
          {paymentSuccessData ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto'
              }}>
                <CheckCircle2 size={36} color="#10b981" />
              </div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>Payment Successful!</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                Your late fine has been verified and cleared by the backend.
              </p>
              <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', padding: '1rem', borderRadius: '10px', textAlign: 'left', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <div>Transaction ID: <strong style={{ fontFamily: 'monospace', color: 'var(--text-main)' }}>{paymentSuccessData.transactionId}</strong></div>
                <div>Status: <strong style={{ color: '#10b981' }}>PAID</strong></div>
              </div>
              <div className="modal-actions" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <Link
                  to={`/student/receipt/${paymentSuccessData.paymentId}`}
                  className="btn btn-primary"
                  onClick={() => setIsPaymentModalOpen(false)}
                >
                  <Receipt size={16} /> Open Official Receipt
                </Link>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsPaymentModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div>
              {paymentError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  <AlertCircle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px', color: '#dc2626' }} />
                  {paymentError}
                </div>
              )}

              {/* Order Summary */}
              <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', padding: '1.25rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Fine Reference:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Record #{selectedFine?.id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Incident Date:</span>
                  <span style={{ color: 'var(--text-main)' }}>{selectedFine?.date?.split('T')[0]}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Late Duration:</span>
                  <span style={{ color: '#f59e0b', fontWeight: 600 }}>{selectedFine?.late_minutes} minutes</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Total Amount:</span>
                  <span style={{ fontWeight: 800, fontSize: '1.35rem', color: '#10b981' }}>
                    ₹{parseFloat(selectedFine?.fine_amount || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Dummy QR Code for Project Demonstration */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: '#f8fafc',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '1rem',
                  marginBottom: '1.25rem',
                  textAlign: 'center'
                }}
              >
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: 'rgba(37, 99, 235, 0.1)',
                  color: '#2563eb',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  marginBottom: '0.75rem',
                  letterSpacing: '0.04em'
                }}>
                  <QrCode size={14} /> Scan QR (Demo)
                </div>

                <div
                  style={{
                    background: '#ffffff',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(226, 232, 240, 0.9)',
                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <DummyQRCode size={140} />
                </div>

                <p style={{ margin: '0.65rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Demo QR Code • Click <strong>Pay ₹{parseFloat(selectedFine?.fine_amount || 0).toFixed(2)}</strong> below to confirm
                </p>
              </div>

              {/* Security & Gateway Notice */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <ShieldCheck size={20} color="var(--primary-500)" style={{ flexShrink: 0 }} />
                <span>
                  Secured with 256-bit SSL encryption. All transactions are cryptographically verified by the backend fine engine.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="modal-actions" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsPaymentModalOpen(false)}
                  disabled={processingPayment}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={handleCompletePayment}
                  disabled={processingPayment || !paymentOrder}
                  style={{ minWidth: '180px' }}
                >
                  <Lock size={16} />
                  {processingPayment ? 'Verifying Signature...' : `Pay ₹${parseFloat(selectedFine?.fine_amount || 0).toFixed(2)}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default StudentFines;
