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
  ArrowRight,
  Check,
  X
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

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedFine, setSelectedFine] = useState(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);
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

  // 1. Open Payment Modal immediately on Pay Fine click
  const handleInitiatePayment = (fine) => {
    setSelectedFine(fine);
    setPaymentError(null);

    // If an active PENDING request already exists for this fine, prefill pending state
    if (fine.paymentRequest && fine.paymentRequest.status === 'PENDING') {
      setPaymentPendingData(fine.paymentRequest);
    } else {
      setPaymentPendingData(null);
    }

    setIsPaymentModalOpen(true);
  };

  // Close Modal and reset transient submission errors
  const handleCloseModal = () => {
    if (!submittingPayment) {
      setIsPaymentModalOpen(false);
      setPaymentError(null);
    }
  };

  // 2. Submit "I Have Paid" Verification Request
  const handleCompletePayment = async () => {
    if (!selectedFine) return;

    // Duplicate check client-side
    const currentPending = paymentPendingData || (selectedFine.paymentRequest?.status === 'PENDING');
    if (currentPending) {
      setPaymentError('Payment request is already pending staff verification.');
      return;
    }

    setSubmittingPayment(true);
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
        await fetchFines(); // Refresh fines list
      }
    } catch (err) {
      setPaymentError(err.message || 'Failed to submit payment request.');
    } finally {
      setSubmittingPayment(false);
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

        {/* Desktop Table View */}
        <div className="table-container desktop-only-table">
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
                        <button
                          type="button"
                          className={`btn ${isPendingVerification ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleInitiatePayment(fine);
                          }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          {isPendingVerification ? (
                            <>
                              <Clock size={14} color="#d97706" /> Pending Verification
                            </>
                          ) : (
                            <>
                              <CreditCard size={14} /> Pay Fine
                            </>
                          )}
                        </button>
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

        {/* Mobile Cards View */}
        <div className="mobile-cards-container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              Loading fines...
            </div>
          ) : pendingFines.length > 0 ? (
            pendingFines.map((fine) => {
              const reqStatus = fine.paymentRequest?.status;
              const isPendingVerification = reqStatus === 'PENDING';
              const isRejected = reqStatus === 'REJECTED';

              return (
                <div key={fine.id} className="mobile-item-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                        {fine.date ? fine.date.split('T')[0] : 'Late Record'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Arrival: {formatISTTime(fine.arrival_time)} ({fine.late_minutes} min late)
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#ef4444' }}>
                        ₹{parseFloat(fine.fine_amount).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.65rem' }}>
                    <div>
                      {isPendingVerification ? (
                        <span className="badge badge-pending">PENDING VERIFICATION</span>
                      ) : isRejected ? (
                        <span className="badge badge-rejected" style={{ background: '#fee2e2', color: '#dc2626' }}>REJECTED</span>
                      ) : (
                        <Badge status={fine.status} />
                      )}
                    </div>
                    <button
                      type="button"
                      className={`btn ${isPendingVerification ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleInitiatePayment(fine);
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      {isPendingVerification ? (
                        <>
                          <Clock size={14} color="#d97706" /> Pending
                        </>
                      ) : (
                        <>
                          <CreditCard size={14} /> Pay Fine
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
              <CheckCircle2 size={28} color="#10b981" style={{ margin: '0 auto 0.5rem auto' }} />
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>No Pending Fines</div>
              <div style={{ fontSize: '0.8rem' }}>Your attendance fine account is settled!</div>
            </div>
          )}
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

        {/* Desktop Table View */}
        <div className="table-container desktop-only-table">
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
                      {paid.transaction_id || (paid.payment_id ? `DEMO-TXN-${paid.payment_id}` : 'N/A')}
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

        {/* Mobile Cards View */}
        <div className="mobile-cards-container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
              Loading history...
            </div>
          ) : paidFines.length > 0 ? (
            paidFines.map((paid) => (
              <div key={paid.id} className="mobile-item-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                      {paid.date ? paid.date.split('T')[0] : 'Settled Fine'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {paid.late_minutes} min late • {paid.paid_at ? formatISTDateTime(paid.paid_at) : 'Paid'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#10b981' }}>
                      ₹{parseFloat(paid.fine_amount).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.65rem' }}>
                  <Badge status="PAID" />
                  <Link
                    to={`/student/receipt/${paid.payment_id || paid.id}`}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Receipt size={14} /> View Receipt
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
              No payment history recorded.
            </div>
          )}
        </div>
      </div>

      {/* Payment Popup Modal — Displays Fine Amount, Dummy QR Code, and "I Have Paid" */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={handleCloseModal}
        title="College Late Fine Payment"
        maxWidth="480px"
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Error Banner */}
          {paymentError && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              marginBottom: '0.85rem',
              fontSize: '0.825rem'
            }}>
              <AlertCircle size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px', color: '#dc2626' }} />
              {paymentError}
            </div>
          )}

          {/* Pending Verification Notice */}
          {paymentPendingData && (
            <div style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              color: '#92400e',
              padding: '0.75rem 0.85rem',
              borderRadius: '8px',
              marginBottom: '0.85rem',
              fontSize: '0.825rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, marginBottom: '0.2rem' }}>
                <Clock size={15} color="#d97706" /> Payment request sent to staff for verification.
              </div>
              <div style={{ fontSize: '0.775rem', color: '#b45309', lineHeight: 1.4 }}>
                Status: <strong>PENDING</strong> — Waiting for staff verification. Official receipt will unlock once staff accepts the payment.
              </div>
            </div>
          )}

          {/* Rejection Notice */}
          {!paymentPendingData && selectedFine?.paymentRequest?.status === 'REJECTED' && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #f87171',
              color: '#991b1b',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              marginBottom: '0.85rem',
              fontSize: '0.825rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, marginBottom: '0.2rem' }}>
                <AlertCircle size={15} color="#dc2626" /> Payment request rejected.
              </div>
              <div style={{ fontSize: '0.775rem' }}>
                {selectedFine.paymentRequest.rejectionReason
                  ? `Reason: ${selectedFine.paymentRequest.rejectionReason}`
                  : 'Please scan the dummy QR code below and submit a new payment verification request.'}
              </div>
            </div>
          )}

          {/* Fine Summary */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid var(--border-subtle)',
            padding: '0.85rem 1rem',
            borderRadius: '8px',
            marginBottom: '0.85rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.825rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Fine Record:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Record #{selectedFine?.id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.825rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Late Incident Date:</span>
              <span style={{ color: 'var(--text-main)' }}>{selectedFine?.date ? String(selectedFine.date).split('T')[0] : ''}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.825rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Late Duration:</span>
              <span style={{ color: '#f59e0b', fontWeight: 600 }}>{selectedFine?.late_minutes} minutes</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '0.5rem',
              marginTop: '0.35rem'
            }}>
              <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.875rem' }}>Fine Amount:</span>
              <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#10b981' }}>
                ₹{parseFloat(selectedFine?.fine_amount || 0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Dummy QR Code Display */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: '#f8fafc',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '0.75rem',
              marginBottom: '0.85rem',
              textAlign: 'center',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              background: 'rgba(37, 99, 235, 0.1)',
              color: '#2563eb',
              padding: '0.2rem 0.65rem',
              borderRadius: '9999px',
              fontSize: '0.72rem',
              fontWeight: 700,
              marginBottom: '0.5rem',
              letterSpacing: '0.03em'
            }}>
              <QrCode size={13} /> Scan QR Code
            </div>

            <div
              style={{
                background: '#ffffff',
                padding: '0.5rem',
                borderRadius: '8px',
                border: '1px solid rgba(226, 232, 240, 0.9)',
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.05)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                width: 'fit-content'
              }}
            >
              <DummyQRCode size={130} />
            </div>

            <p style={{ margin: '0.45rem 0 0 0', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Scan QR to complete payment
            </p>
            <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
              Scan the QR code to complete payment, then tap "Paid" below
            </p>
          </div>

          {/* Security & Verification Notice */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            background: 'rgba(37,99,235,0.06)',
            border: '1px solid rgba(37,99,235,0.15)',
            padding: '0.65rem 0.75rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            lineHeight: 1.35
          }}>
            <ShieldCheck size={18} color="var(--primary-500)" style={{ flexShrink: 0 }} />
            <span>
              Tapping "Paid" creates a verification request for staff. Official receipt unlocks after staff verification.
            </span>
          </div>

          {/* Modal Action Buttons */}
          <div className="modal-actions" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCloseModal}
              disabled={submittingPayment}
            >
              {paymentPendingData ? 'Close' : 'Cancel'}
            </button>

            {paymentPendingData ? (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={true}
                style={{ minWidth: '150px', opacity: 0.7, cursor: 'not-allowed' }}
              >
                <Clock size={15} color="#d97706" /> Request Pending
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={handleCompletePayment}
                disabled={submittingPayment || (selectedFine?.paymentRequest?.status === 'PENDING')}
                style={{ minWidth: '150px' }}
              >
                <Check size={15} />
                {submittingPayment ? 'Submitting...' : 'Paid'}
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StudentFines;
