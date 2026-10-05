import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Clock,
  CheckCircle2,
  RefreshCw,
  Check,
  X
} from 'lucide-react';
import api from '../../services/api';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import Toast from '../../components/Toast';
import { formatISTDateTime } from '../../utils/timeUtils';

const StaffPaymentRequests = () => {
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Reject Modal State
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [selectedRequestForReject, setSelectedRequestForReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Toast State
  const [toastMessage, setToastMessage] = useState(null);

  const fetchPaymentRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await api.get('/payments/requests');
      if (res.success) {
        setPaymentRequests(res.requests || []);
      }
    } catch (err) {
      console.error('Failed to load payment requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchPaymentRequests();
  }, []);

  // Staff Action: VERIFY & ACCEPT
  const handleVerifyAndAccept = async (request) => {
    const requestId = request.paymentId || request.id;
    setActionLoadingId(requestId);
    try {
      const res = await api.post(`/payments/${requestId}/verify`);
      if (res.success) {
        setToastMessage({ message: 'Payment verified & accepted successfully!', type: 'success' });
        await fetchPaymentRequests();
      }
    } catch (err) {
      setToastMessage({ message: err.message || 'Failed to verify payment request.', type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Staff Action: Open REJECT modal
  const handleOpenRejectModal = (request) => {
    setSelectedRequestForReject(request);
    setRejectionReason('');
    setRejectionModalOpen(true);
  };

  // Staff Action: Confirm REJECT
  const handleConfirmReject = async () => {
    if (!selectedRequestForReject) return;
    const requestId = selectedRequestForReject.paymentId || selectedRequestForReject.id;
    setActionLoadingId(requestId);
    try {
      const res = await api.post(`/payments/${requestId}/reject`, {
        reason: rejectionReason.trim() || undefined
      });
      if (res.success) {
        setToastMessage({ message: 'Payment request rejected.', type: 'info' });
        setRejectionModalOpen(false);
        setSelectedRequestForReject(null);
        await fetchPaymentRequests();
      }
    } catch (err) {
      setToastMessage({ message: err.message || 'Failed to reject payment request.', type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const pendingRequestsCount = paymentRequests.filter((r) => r.status === 'PENDING').length;

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Payment Verification Requests</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Review student fine payment submissions, verify transactions, and unlock official receipts
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="badge badge-pending">
            {pendingRequestsCount} Pending
          </span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={fetchPaymentRequests}>
            <RefreshCw size={14} /> Refresh Requests
          </button>
        </div>
      </div>

      {/* Payment Requests Section */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard size={20} color="#2563eb" /> Student Payment Submissions
            </h2>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="table-container desktop-only-table">
          <table>
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Student ID / Code</th>
                <th>Fine Amount</th>
                <th>Submitted Time</th>
                <th>Payment Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingRequests ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    Loading payment requests...
                  </td>
                </tr>
              ) : paymentRequests.length > 0 ? (
                paymentRequests.map((req) => {
                  const reqId = req.paymentId || req.id;
                  const isPending = req.status === 'PENDING';
                  const isActionLoading = actionLoadingId === reqId;

                  return (
                    <tr key={reqId}>
                      <td style={{ fontWeight: 600 }}>{req.studentName || 'Student'}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary-400)' }}>
                        {req.studentCode || req.studentId || 'N/A'}
                      </td>
                      <td style={{ fontWeight: 800, fontSize: '1rem', color: '#ef4444' }}>
                        ₹{parseFloat(req.fineAmount || 0).toFixed(2)}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {req.submittedAt ? formatISTDateTime(req.submittedAt) : 'N/A'}
                      </td>
                      <td>
                        <Badge status={req.status} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isPending ? (
                          <div style={{ display: 'inline-flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              style={{
                                background: '#10b981',
                                borderColor: '#10b981',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem'
                              }}
                              onClick={() => handleVerifyAndAccept(req)}
                              disabled={isActionLoading}
                            >
                              <Check size={14} />
                              {isActionLoading ? 'Verifying...' : 'VERIFY & ACCEPT'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{
                                color: '#ef4444',
                                borderColor: 'rgba(239, 68, 68, 0.4)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem'
                              }}
                              onClick={() => handleOpenRejectModal(req)}
                              disabled={isActionLoading}
                            >
                              <X size={14} />
                              REJECT
                            </button>
                          </div>
                        ) : req.status === 'PAID' ? (
                          <div style={{ fontSize: '0.8rem', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CheckCircle2 size={14} />
                            <span>Verified by {req.verifiedBy || 'Staff'}</span>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.8rem', color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <X size={14} />
                            <span>Rejected {req.rejectionReason ? `(${req.rejectionReason})` : ''}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle2 size={32} color="#10b981" />
                      <span style={{ fontWeight: 600, color: '#fff' }}>No Pending Payment Requests</span>
                      <span style={{ fontSize: '0.85rem' }}>All student fine payments are up to date!</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="mobile-cards-container">
          {loadingRequests ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              Loading payment requests...
            </div>
          ) : paymentRequests.length > 0 ? (
            paymentRequests.map((req) => {
              const reqId = req.paymentId || req.id;
              const isPending = req.status === 'PENDING';
              const isActionLoading = actionLoadingId === reqId;

              return (
                <div key={reqId} className="mobile-item-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                        {req.studentName || 'Student'}
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--primary-400)', marginTop: '0.15rem' }}>
                        ID: {req.studentCode || req.studentId || 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        {req.submittedAt ? formatISTDateTime(req.submittedAt) : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#ef4444' }}>
                        ₹{parseFloat(req.fineAmount || 0).toFixed(2)}
                      </div>
                      <div style={{ marginTop: '0.35rem' }}>
                        <Badge status={req.status} />
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                    {isPending ? (
                      <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          style={{
                            background: '#10b981',
                            borderColor: '#10b981',
                            flex: 1,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem',
                            padding: '0.65rem 0.5rem'
                          }}
                          onClick={() => handleVerifyAndAccept(req)}
                          disabled={isActionLoading}
                        >
                          <Check size={14} />
                          {isActionLoading ? 'Verifying...' : 'VERIFY & ACCEPT'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{
                            color: '#ef4444',
                            borderColor: 'rgba(239, 68, 68, 0.4)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem',
                            padding: '0.65rem 0.85rem'
                          }}
                          onClick={() => handleOpenRejectModal(req)}
                          disabled={isActionLoading}
                        >
                          <X size={14} />
                          REJECT
                        </button>
                      </div>
                    ) : req.status === 'PAID' ? (
                      <div style={{ fontSize: '0.8rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <CheckCircle2 size={15} />
                        <span>Verified by {req.verifiedBy || 'Staff'}</span>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <X size={15} />
                        <span>Rejected {req.rejectionReason ? `(${req.rejectionReason})` : ''}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
              <CheckCircle2 size={28} color="#10b981" style={{ margin: '0 auto 0.5rem auto' }} />
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>No Pending Requests</div>
              <div style={{ fontSize: '0.8rem' }}>All student fine payments are up to date!</div>
            </div>
          )}
        </div>
      </div>

      {/* Reject Payment Request Modal */}
      <Modal
        isOpen={rejectionModalOpen}
        onClose={() => !actionLoadingId && setRejectionModalOpen(false)}
        title="Reject Payment Request"
        maxWidth="480px"
      >
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            Are you sure you want to reject this payment request? The student will be notified that the request was rejected and can submit a new payment request.
          </p>

          <div style={{
            background: '#f8fafc',
            border: '1px solid var(--border-subtle)',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            fontSize: '0.85rem'
          }}>
            <div style={{ marginBottom: '0.35rem' }}>
              Student: <strong style={{ color: 'var(--text-main)' }}>{selectedRequestForReject?.studentName}</strong> ({selectedRequestForReject?.studentCode})
            </div>
            <div style={{ marginBottom: '0.35rem' }}>
              Fine Amount: <strong style={{ color: '#ef4444' }}>₹{parseFloat(selectedRequestForReject?.fineAmount || 0).toFixed(2)}</strong>
            </div>
            <div>
              Payment ID: <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{selectedRequestForReject?.paymentId || selectedRequestForReject?.id}</span>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
              Reason for Rejection (Optional)
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Unrecognized transaction, incorrect amount, etc."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div className="modal-actions" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setRejectionModalOpen(false)}
              disabled={actionLoadingId !== null}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ background: '#ef4444', borderColor: '#ef4444' }}
              onClick={handleConfirmReject}
              disabled={actionLoadingId !== null}
            >
              {actionLoadingId ? 'Rejecting...' : 'Reject Request'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StaffPaymentRequests;
