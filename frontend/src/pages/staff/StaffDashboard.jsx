import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ScanLine,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  CreditCard,
  Check,
  X
} from 'lucide-react';
import api from '../../services/api';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import Toast from '../../components/Toast';
import { formatISTTime, formatISTDateTime, getIndiaTodayStr } from '../../utils/timeUtils';

const StaffDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Payment Requests State
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Reject Modal State
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [selectedRequestForReject, setSelectedRequestForReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Toast State
  const [toastMessage, setToastMessage] = useState(null);

  const fetchStaffData = async () => {
    setLoading(true);
    try {
      const todayStr = getIndiaTodayStr();
      const res = await api.get('/late-records', { params: { date: todayStr } });
      if (res.success) {
        const records = res.records || [];
        const lateCount = records.filter((r) => r.late_minutes > 0).length;
        const pendingFineSum = records
          .filter((r) => r.status === 'PENDING')
          .reduce((sum, r) => sum + parseFloat(r.fine_amount || 0), 0);

        setData({
          totalScannedToday: records.length,
          totalLateToday: lateCount,
          pendingFineSum,
          recentScans: records.slice(0, 10)
        });
      }
    } catch (err) {
      console.error('Failed to load staff dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

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
    fetchStaffData();
    fetchPaymentRequests();
  }, []);

  const handleRefreshAll = () => {
    fetchStaffData();
    fetchPaymentRequests();
  };

  // Staff Action: VERIFY & ACCEPT
  const handleVerifyAndAccept = async (request) => {
    const requestId = request.paymentId || request.id;
    setActionLoadingId(requestId);
    try {
      const res = await api.post(`/payments/${requestId}/verify`);
      if (res.success) {
        setToastMessage({ message: 'Payment verified & accepted successfully!', type: 'success' });
        await Promise.all([fetchPaymentRequests(), fetchStaffData()]);
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
        await Promise.all([fetchPaymentRequests(), fetchStaffData()]);
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

      {/* Header & Primary Gate Action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Staff Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Record student arrival times by scanning student ID card barcodes and verify student fine payments
          </p>
        </div>
        <Link to="/staff/scan" className="btn btn-primary btn-lg" style={{ boxShadow: '0 0 20px rgba(37,99,235,0.4)' }}>
          <ScanLine size={20} /> Open ID Barcode Scanner
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="dashboard-grid">
        <StatCard
          title="Today's Total Scans"
          value={data?.totalScannedToday ?? 0}
          icon={Clock}
          color="cyan"
          subtitle="Processed at entry gate"
        />
        <StatCard
          title="Today's Late Arrivals"
          value={data?.totalLateToday ?? 0}
          icon={AlertTriangle}
          color="amber"
          subtitle="Exceeded reporting time"
        />
        <StatCard
          title="Today's Fines Created"
          value={`₹${data?.pendingFineSum ? data.pendingFineSum.toFixed(2) : '0.00'}`}
          icon={ScanLine}
          color="purple"
          subtitle="Pending student payment"
        />
      </div>

      {/* Payment Requests Section */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard size={20} color="#2563eb" /> Payment Verification Requests
            </h2>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Review student-submitted payment requests and verify to clear fines and unlock official receipts
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="badge badge-pending">
              {pendingRequestsCount} Pending
            </span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={fetchPaymentRequests}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        <div className="table-container">
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
                            <XCircle size={14} />
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
      </div>

      {/* Recent Scans Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Today's Scanned Students</h2>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Real-time feed of gate entries recorded today
            </p>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleRefreshAll}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Student Code</th>
                <th>Student Name</th>
                <th>Register No.</th>
                <th>Department</th>
                <th>Arrival Time</th>
                <th>Late Duration</th>
                <th>Fine (₹)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    Loading today's records...
                  </td>
                </tr>
              ) : data?.recentScans && data.recentScans.length > 0 ? (
                data.recentScans.map((rec) => (
                  <tr key={rec.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary-400)' }}>
                      {rec.student_code}
                    </td>
                    <td style={{ fontWeight: 600 }}>{rec.student_name}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {rec.register_number}
                    </td>
                    <td>{rec.department}</td>
                    <td style={{ fontFamily: 'monospace' }}>{formatISTTime(rec.arrival_time)}</td>
                    <td>
                      <span style={{ color: rec.late_minutes > 0 ? '#f59e0b' : '#10b981', fontWeight: 600 }}>
                        {rec.late_minutes > 0 ? `${rec.late_minutes} min late` : 'On Time'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#fff' }}>
                      ₹{parseFloat(rec.fine_amount).toFixed(2)}
                    </td>
                    <td>
                      <Badge status={rec.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                    No students have been scanned yet today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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

export default StaffDashboard;
