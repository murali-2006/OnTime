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
  QrCode,
  Send,
  XCircle
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
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentPendingData, setPaymentPendingData] = useState(null);
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

  // 1. Open Payment Modal
  const handleInitiatePayment = (fine) => {
    setSelectedFine(fine);
    setPaymentError(null);

    // If an active PENDING request already exists for this fine, show pending status view
    if (fine.paymentRequest && fine.paymentRequest.status === 'PENDING') {
      setPaymentPendingData(fine.paymentRequest);
    } else {
      setPaymentPendingData(null);
    }

    setIsPaymentModalOpen(true);
  };

  // 2. Submit "I Have Paid" Verification Request
  const handleCompletePayment = async () => {
    if (!selectedFine) return;

    // Duplicate check client-side
    if (selectedFine.paymentRequest && selectedFine.paymentRequest.status === 'PENDING') {
      setPaymentError('Payment request is already pending staff verification.');
      return;
    }

    setProcessingPayment(true);
    setPaymentError(null);

    try {
      const res = await api.post('/payments/request', {
        lateRecordId: selectedFine.id
      });

      if (res.success && res.payment) {
        setPaymentPendingData(res.payment);
        setToastMessage({
          message: 'Payment request sent to staff for verification.',
          type: 'success'
        });
        fetchFines(); // Refresh fines list
      }
    } catch (err) {
      setPaymentError(err.message || 'Failed to submit payment request.');
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
                <th>Payment Status</th>
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
                pendingFines.map((fine) => {
                  const reqStatus = fine.paymentRequest?.status;
                  const isPendingVerification = reqStatus === 'PENDING';
                  const isRejected = reqStatus === 'REJECTED';

                  return (
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
                        {isPendingVerification ? (
                          <div>
                            <Badge status="PENDING" text="PENDING" />
                            <div style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: '0.2rem', fontWeight: 500 }}>
                              Waiting for staff verification
                            </div>
                          </div>
                        ) : isRejected ? (
                          <div>
                            <Badge status="REJECTED" text="REJECTED" />
                            <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.2rem', fontWeight: 500 }}>
                              Payment request rejected
                            </div>
                          </div>
                        ) : (
                          <Badge status={fine.status} />
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isPendingVerification ? (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleInitiatePayment(fine)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                          >
                            <Clock size={14} color="#f59e0b" /> View Request
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleInitiatePayment(fine)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                          >
                            <CreditCard size={14} /> Pay Fine
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
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
                <th>Payment ID</th>
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
                      {paid.payment_id || paid.transaction_id || 'VERIFIED'}
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

      {/* Payment Popup Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => !processingPayment && setIsPaymentModalOpen(false)}
        title="College Late Fine Payment"
        maxWidth="500px"
      >
        <div>
          {paymentPendingData ? (
            /* Staff Verification Pending State Screen */
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto'
              }}>
                <Clock size={36} color="#f59e0b" />
              </div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                Payment Request Submitted
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                Payment request sent to staff for verification.
              </p>

              <div style={{
                background: '#f8fafc',
                border: '1px solid var(--border-subtle)',
                padding: '1.1rem',
                borderRadius: '10px',
                textAlign: 'left',
                marginBottom: '1.5rem',
                fontSize: '0.85rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Payment ID:</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--text-main)' }}>
                    {paymentPendingData.paymentId || paymentPendingData.id}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Fine Amount:</span>
                  <strong style={{ color: '#ef4444' }}>
                    ₹{parseFloat(selectedFine?.fine_amount || paymentPendingData.fineAmount || 0).toFixed(2)}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                  <span className="badge badge-pending">PENDING</span>
                </div>
                <div style={{
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '0.65rem',
                  marginTop: '0.65rem',
                  fontSize: '0.8rem',
                  color: '#b45309',
                  background: '#fef3c7',
                  padding: '0.65rem',
                  borderRadius: '6px',
                  fontWeight: 500
                }}>
                  Payment submitted. Waiting for staff verification.
                  <br />
                  <span style={{ fontSize: '0.75rem', color: '#92400e' }}>
                    Your official receipt will be generated immediately once staff approves.
                  </span>
                </div>
              </div>

              <div className="modal-actions" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
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
            /* Student Payment Flow Screen */
            <div>
              {paymentError && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  fontSize: '0.85rem'
                }}>
                  <AlertCircle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px', color: '#dc2626' }} />
                  {paymentError}
                </div>
              )}

              {/* Show Rejection Banner if previously rejected */}
              {selectedFine?.paymentRequest?.status === 'REJECTED' && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #f87171',
                  color: '#991b1b',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  fontSize: '0.85rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    <XCircle size={16} color="#dc2626" /> Payment request rejected.
                  </div>
                  <div>
                    {selectedFine.paymentRequest.rejectionReason
                      ? `Reason: ${selectedFine.paymentRequest.rejectionReason}`
                      : 'Please scan the QR code and submit a new verification request.'}
                  </div>
                </div>
              )}

              {/* Order Summary */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid var(--border-subtle)',
                padding: '1.25rem',
                borderRadius: '10px',
                marginBottom: '1.25rem'
              }}>
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
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '0.75rem',
                  marginTop: '0.5rem'
                }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Fine Amount:</span>
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

                <p style={{ margin: '0.65rem 0 0 0', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Scan QR to complete payment
                </p>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Demonstration QR Code • Scan using camera/scanner, then click below
                </p>
              </div>

              {/* Security & Verification Notice */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(37,99,235,0.06)',
                border: '1px solid rgba(37,99,235,0.15)',
                padding: '0.75rem',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                fontSize: '0.8rem',
                color: 'var(--text-muted)'
              }}>
                <ShieldCheck size={20} color="var(--primary-500)" style={{ flexShrink: 0 }} />
                <span>
                  After clicking "I Have Paid", your request will be verified by staff before the fine is marked as PAID and your official receipt is issued.
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
                  disabled={processingPayment || selectedFine?.paymentRequest?.status === 'PENDING'}
                  style={{ minWidth: '160px' }}
                >
                  <Send size={16} />
                  {processingPayment ? 'Submitting...' : 'I Have Paid'}
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
