import React, { useState, useEffect } from 'react';
import {
  Settings,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Calculator,
  Save
} from 'lucide-react';
import api from '../../services/api';
import Toast from '../../components/Toast';

const SESSION_TIMINGS = [
  { name: '1st Period', time: '09:00:00', label: '9:00 AM' },
  { name: '1st Break', time: '11:00:00', label: '11:00 AM' },
  { name: 'Lunch', time: '13:15:00', label: '1:15 PM' },
  { name: '2nd Break', time: '15:00:00', label: '3:00 PM' }
];

const SettingsPage = () => {
  const [reportingTime, setReportingTime] = useState('09:00:00');
  const [lateEnabled, setLateEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Live test arrival calculator states
  const [testArrivalTime, setTestArrivalTime] = useState('09:17');
  const [testResult, setTestResult] = useState(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/settings');
      if (res.success && res.settings) {
        setReportingTime(res.settings.reporting_time || '09:00:00');
        setLateEnabled(res.settings.late_enabled ?? true);
      }
    } catch (err) {
      setToastMessage({ message: err.message || 'Failed to fetch settings.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/admin/settings', {
        reportingTime,
        lateEnabled
      });
      if (res.success) {
        setToastMessage({ message: 'College reporting settings saved successfully!', type: 'success' });
        setReportingTime(res.settings.reporting_time);
        setLateEnabled(res.settings.late_enabled);
      }
    } catch (err) {
      setToastMessage({ message: err.message || 'Failed to save settings.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Quick helper to simulate local calculation preview
  const handleTestCalculate = () => {
    if (!testArrivalTime) return;
    const [tH, tM] = testArrivalTime.split(':').map(Number);
    const [rH, rM] = reportingTime.split(':').map(Number);

    const arrMins = tH * 60 + tM;
    const repMins = rH * 60 + rM;
    const lateMins = arrMins - repMins;

    if (lateMins <= 0) {
      setTestResult({
        lateMinutes: 0,
        isLate: false,
        message: 'On Time / Early Arrival (No fine applied)'
      });
    } else {
      setTestResult({
        lateMinutes: lateMins,
        isLate: true,
        message: `Late by ${lateMins} minute(s). Fine will be evaluated against active database fine rules.`
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px' }}>
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
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>College Operational Settings</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Configure institution-wide reporting time baseline and attendance tracking parameters
        </p>
      </div>

      {/* Main Settings Form Card */}
      <div className="card">
        <form onSubmit={handleSave}>
          <div className="card-header" style={{ marginBottom: '1.5rem' }}>
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={20} color="var(--primary-500)" /> Official Reporting Baseline
            </h2>
          </div>

          <div className="form-group">
            <label className="form-label">
              Standard College Reporting Time (HH:MM:SS) *
            </label>
            <input
              type="time"
              step="1"
              className="form-input"
              style={{ maxWidth: '240px', fontSize: '1.1rem', fontFamily: 'monospace' }}
              value={reportingTime}
              onChange={(e) => setReportingTime(e.target.value)}
              required
            />
            <div style={{ marginTop: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                Configured Session Timings:
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {SESSION_TIMINGS.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    className={`btn btn-sm ${reportingTime === s.time ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setReportingTime(s.time)}
                  >
                    {s.name} ({s.label})
                  </button>
                ))}
              </div>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Any student scanned after this timestamp is automatically flagged as late by the server.
            </span>
          </div>

          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.85rem', margin: '1.5rem 0' }}>
            <input
              type="checkbox"
              id="lateEnabledToggle"
              style={{ width: 20, height: 20, cursor: 'pointer' }}
              checked={lateEnabled}
              onChange={(e) => setLateEnabled(e.target.checked)}
            />
            <div>
              <label htmlFor="lateEnabledToggle" style={{ fontWeight: 600, color: '#fff', cursor: 'pointer', display: 'block' }}>
                Enable Late-Arrival Fine Enforcement
              </label>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                When active, gate scans automatically calculate fines and generate pending records.
              </span>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={16} /> {saving ? 'Updating Settings...' : 'Save Settings'}
          </button>
        </form>
      </div>

      {/* Interactive Simulator Card */}
      <div className="card" style={{ background: 'var(--bg-input)' }}>
        <div className="card-header" style={{ marginBottom: '1rem' }}>
          <h2 className="card-title" style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calculator size={18} color="var(--accent-cyan)" /> Arrival Time Simulator
          </h2>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Test how any arbitrary student arrival time interacts with current reporting baseline ({reportingTime}):
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="time"
            className="form-input"
            style={{ width: '180px' }}
            value={testArrivalTime}
            onChange={(e) => setTestArrivalTime(e.target.value)}
          />
          <button type="button" className="btn btn-secondary" onClick={handleTestCalculate}>
            Calculate Late Duration
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
          {SESSION_TIMINGS.map((s) => (
            <button
              key={s.name}
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem' }}
              onClick={() => {
                const hhmm = s.time.substring(0, 5);
                setTestArrivalTime(hhmm);
              }}
            >
              Test {s.name} ({s.label})
            </button>
          ))}
        </div>

        {testResult && (
          <div
            style={{
              marginTop: '1.25rem',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: testResult.isLate ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              border: `1px solid ${testResult.isLate ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: testResult.isLate ? '#f59e0b' : '#10b981' }}>
              {testResult.isLate ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
              {testResult.message}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Reporting Time: <strong>{reportingTime}</strong> | Scanned Arrival: <strong>{testArrivalTime}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
