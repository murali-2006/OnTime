import React, { useState } from 'react';
import {
  ScanLine,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  IndianRupee,
  User,
  ArrowRight,
  RotateCcw,
  Check
} from 'lucide-react';
import api from '../../services/api';
import CameraScanner from '../../components/CameraScanner';
import Badge from '../../components/Badge';
import Toast from '../../components/Toast';

const ScanPage = () => {
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmedRecord, setConfirmedRecord] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Handle barcode scanned from camera or manual input
  const handleBarcodeScanned = async (studentCode) => {
    if (loading || confirming) return;

    setScanError(null);
    setConfirmedRecord(null);
    setLoading(true);

    try {
      // POST /api/scan
      const res = await api.post('/scan', { studentCode });
      if (res.success && res.data) {
        setScanResult(res.data);
        setIsScanning(false); // Pause scanner while staff reviews
      }
    } catch (err) {
      setScanError({
        message: err.message || 'Error identifying barcode.',
        code: err.code,
        existingRecord: err.existingRecord,
        student: err.student
      });
      setIsScanning(false); // Pause so error isn't immediately cleared
    } finally {
      setLoading(false);
    }
  };

  // Staff clicks "Confirm Entry" to create the final record
  const handleConfirmEntry = async () => {
    if (!scanResult || !scanResult.student) return;

    setConfirming(true);
    try {
      // POST /api/late-records
      const res = await api.post('/late-records', {
        studentId: scanResult.student.id
      });

      if (res.success) {
        setConfirmedRecord(res.record);
        setToastMessage({ message: res.message, type: 'success' });
      }
    } catch (err) {
      setToastMessage({ message: err.message || 'Failed to save entry record.', type: 'error' });
    } finally {
      setConfirming(false);
    }
  };

  // Reset scanner to scan another student
  const handleResetScanner = () => {
    setScanResult(null);
    setConfirmedRecord(null);
    setScanError(null);
    setIsScanning(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
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
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.85rem', marginBottom: '0.35rem' }}>Student ID Barcode Scanner</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Align the student ID card barcode with the camera or enter the student identifier below
        </p>
      </div>

      {/* Camera Barcode Scanner Component */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <CameraScanner
          onScan={handleBarcodeScanned}
          isPaused={!isScanning || !!scanResult || !!scanError}
        />
      </div>

      {/* Loading state indicator */}
      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <p style={{ color: 'var(--primary-400)', fontWeight: 600 }}>
            Identifying student & verifying arrival timestamp...
          </p>
        </div>
      )}

      {/* Error or Duplicate Scan Alert */}
      {scanError && !loading && (
        <div
          className="card"
          style={{
            borderLeft: `4px solid ${scanError.code === 'DUPLICATE_SCAN' ? 'var(--status-pending)' : 'var(--status-failed)'}`,
            background: 'var(--bg-input)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
            {scanError.code === 'DUPLICATE_SCAN' ? (
              <AlertTriangle size={24} color="#f59e0b" style={{ flexShrink: 0 }} />
            ) : (
              <AlertCircle size={24} color="#ef4444" style={{ flexShrink: 0 }} />
            )}
            <div>
              <h3 style={{ fontSize: '1.05rem', color: scanError.code === 'DUPLICATE_SCAN' ? '#f59e0b' : '#ef4444' }}>
                {scanError.message}
              </h3>
              {scanError.student && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Student: <strong>{scanError.student.name}</strong> ({scanError.student.studentCode}) • Reg: {scanError.student.registerNumber}
                </p>
              )}
              {scanError.existingRecord && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                  Previously recorded at: {scanError.existingRecord.arrivalTime} | Late by: {scanError.existingRecord.lateMinutes} min | Status: {scanError.existingRecord.status}
                </p>
              )}
            </div>
          </div>

          <button type="button" className="btn btn-secondary btn-sm" onClick={handleResetScanner}>
            <RotateCcw size={14} /> Scan Next Student
          </button>
        </div>
      )}

      {/* Scanned Student Preview & Confirmation Card */}
      {scanResult && !confirmedRecord && (
        <div className="card" style={{ border: '1px solid var(--primary-600)', animation: 'scaleUp 0.25s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={22} color="#10b981" />
              <h2 style={{ fontSize: '1.25rem' }}>Student Identified</h2>
            </div>
            <span className="badge badge-active">{scanResult.student.studentCode}</span>
          </div>

          {/* Student Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem', background: '#f8fafc', border: '1px solid var(--border-subtle)', padding: '1rem', borderRadius: '10px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Student Name</span>
              <p style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-main)' }}>{scanResult.student.name}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Register Number</span>
              <p style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-main)' }}>{scanResult.student.registerNumber}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Department</span>
              <p style={{ color: 'var(--text-main)' }}>{scanResult.student.department}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Academic Year</span>
              <p style={{ color: 'var(--text-main)' }}>{scanResult.student.year}</p>
            </div>
          </div>

          {/* Arrival & Late Calculation Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ padding: '1rem', textAlign: 'center', background: 'var(--bg-main)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {scanResult.sessionName ? `${scanResult.sessionName} (${scanResult.sessionLabel})` : 'Reporting Baseline'}
              </span>
              <p style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>
                {scanResult.reportingTime}
              </p>
            </div>

            <div className="card" style={{ padding: '1rem', textAlign: 'center', background: 'var(--bg-main)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gate Arrival Time</span>
              <p style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-400)', marginTop: '0.25rem' }}>
                {scanResult.arrivalTime}
              </p>
            </div>

            <div className="card" style={{ padding: '1rem', textAlign: 'center', background: 'var(--bg-main)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Late Duration</span>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: scanResult.isLate ? '#f59e0b' : '#10b981', marginTop: '0.25rem' }}>
                {scanResult.isLate ? `${scanResult.lateMinutes} min` : '0 min (On Time)'}
              </p>
            </div>

            <div className="card" style={{ padding: '1rem', textAlign: 'center', background: 'var(--bg-main)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Applicable Fine</span>
              <p style={{ fontSize: '1.35rem', fontWeight: 800, color: scanResult.isLate ? '#ef4444' : '#10b981', marginTop: '0.25rem' }}>
                ₹{parseFloat(scanResult.fineAmount).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Confirmation Action */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleResetScanner}
              disabled={confirming}
            >
              Cancel / Scan Another
            </button>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={handleConfirmEntry}
              disabled={confirming}
              style={{ minWidth: '180px' }}
            >
              <Check size={18} /> {confirming ? 'Saving Entry...' : 'Confirm Entry'}
            </button>
          </div>
        </div>
      )}

      {/* Post-Confirmation Success View */}
      {confirmedRecord && (
        <div className="card" style={{ border: '2px solid #10b981', background: 'rgba(16, 185, 129, 0.05)', textAlign: 'center', padding: '2rem' }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem auto'
          }}>
            <CheckCircle2 size={32} color="#10b981" />
          </div>

          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.35rem' }}>Late Entry Successfully Recorded</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Entry record #{confirmedRecord.id} has been permanently saved to the database.
          </p>

          <div style={{ maxWidth: '400px', margin: '0 auto 1.75rem auto', textAlign: 'left', background: '#f8fafc', border: '1px solid var(--border-subtle)', padding: '1rem 1.25rem', borderRadius: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Student:</span>
              <strong style={{ color: 'var(--text-main)' }}>{confirmedRecord.student?.name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Late Duration:</span>
              <span style={{ color: '#f59e0b', fontWeight: 600 }}>{confirmedRecord.late_minutes} minutes</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Fine Amount:</span>
              <strong style={{ color: '#ef4444' }}>₹{parseFloat(confirmedRecord.fine_amount).toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Fine Status:</span>
              <Badge status={confirmedRecord.status} />
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={handleResetScanner}
          >
            <ScanLine size={18} /> Scan Next Student
          </button>
        </div>
      )}
    </div>
  );
};

export default ScanPage;
