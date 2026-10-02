import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Calculator,
  RotateCcw,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import api from '../../services/api';
import Toast from '../../components/Toast';
import Modal from '../../components/Modal';
import {
  SESSION_TIMINGS,
  getSessionForTime,
  calculateLateDuration
} from '../../utils/timeUtils';

const SettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  // Active fine rules from backend for dynamic simulator calculations (no hardcoded fine amounts)
  const [fineRules, setFineRules] = useState([]);

  // Live test arrival calculator states
  const [testScheduledTime, setTestScheduledTime] = useState('9:00 AM');
  const [testArrivalTime, setTestArrivalTime] = useState('9:18 AM');
  const [testResult, setTestResult] = useState(null);

  // Demo Reset Modal State (ONLY on College Settings page)
  const [isDemoResetModalOpen, setIsDemoResetModalOpen] = useState(false);
  const [resettingDemo, setResettingDemo] = useState(false);

  // Current session auto-detected
  const currentSession = getSessionForTime(new Date());

  const fetchSettingsAndRules = async () => {
    setLoading(true);
    try {
      const rulesRes = await api.get('/admin/fine-rules');
      if (rulesRes.success && rulesRes.rules) {
        setFineRules(rulesRes.rules.filter((r) => r.active));
      }
    } catch (err) {
      setToastMessage({ message: err.message || 'Failed to load fine rules for simulator.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndRules();
  }, []);

  // Robust calculation handling AM/PM, seconds, 24-hr format, negative values, and dynamic fine lookup
  const handleTestCalculate = () => {
    if (!testScheduledTime || !testArrivalTime) return;

    const calc = calculateLateDuration(testScheduledTime, testArrivalTime);

    if (!calc.isLate) {
      setTestResult({
        scheduled: testScheduledTime,
        arrival: testArrivalTime,
        lateMinutes: 0,
        isLate: false,
        fineAmount: 0.00,
        message: 'On Time / Early Arrival (No late fine applied)'
      });
      return;
    }

    // Dynamically match active fine rules from database (no hardcoded fine amounts)
    let fineAmount = 0.00;
    let matchedRule = null;

    for (const rule of fineRules) {
      const min = parseInt(rule.min_minutes, 10);
      const max = rule.max_minutes !== null ? parseInt(rule.max_minutes, 10) : Infinity;
      if (calc.lateMinutes >= min && calc.lateMinutes <= max) {
        fineAmount = parseFloat(rule.fine_amount);
        matchedRule = rule;
        break;
      }
    }

    setTestResult({
      scheduled: testScheduledTime,
      arrival: testArrivalTime,
      lateMinutes: calc.lateMinutes,
      isLate: true,
      fineAmount,
      ruleName: matchedRule ? matchedRule.rule_name : null,
      message: `Late by ${calc.lateMinutes} minute(s). Dynamic fine evaluated from active rules: ₹${fineAmount.toFixed(2)}${
        matchedRule ? ` (Matched: "${matchedRule.rule_name}")` : ''
      }`
    });
  };

  const handleConfirmDemoReset = async () => {
    setResettingDemo(true);
    try {
      const res = await api.post('/admin/demo-reset');
      if (res.success) {
        setToastMessage({
          message: res.message || "Today's demo data reset successfully!",
          type: 'success'
        });
        setIsDemoResetModalOpen(false);
      }
    } catch (err) {
      setToastMessage({
        message: err.message || 'Failed to reset demo data.',
        type: 'error'
      });
    } finally {
      setResettingDemo(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {toastMessage && (
        <div className="toast-container">
          <Toast
            message={toastMessage.message}
            type={toastMessage.type}
            onClose={() => setToastMessage(null)}
          />
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>College Operational Settings</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Official session timings, arrival duration calculation simulator, and presentation controls
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ borderColor: 'rgba(245, 158, 11, 0.5)', color: '#f59e0b', fontWeight: 600 }}
          onClick={() => setIsDemoResetModalOpen(true)}
          title="Safely reset today's demo scans & test payments for live demonstration"
        >
          <RotateCcw size={15} /> Reset Demo Data
        </button>
      </div>

      {/* 1. Automated Session Timings Card */}
      <div className="card">
        <div className="card-header" style={{ marginBottom: '1.25rem' }}>
          <div>
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem' }}>
              <Clock size={20} color="var(--primary-500)" /> Official College Session Timings
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              The system centrally and automatically determines the applicable session based on current server time upon scanning.
            </p>
          </div>
        </div>

        {/* 4 Fixed Session Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          {SESSION_TIMINGS.map((s) => {
            const isActive = currentSession.name === s.name;
            return (
              <div
                key={s.name}
                style={{
                  background: isActive ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-input)',
                  border: `1px solid ${isActive ? 'var(--primary-500)' : 'var(--border-subtle)'}`,
                  borderRadius: '10px',
                  padding: '1.15rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  position: 'relative'
                }}
              >
                {isActive && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: 'var(--primary-600)',
                      color: '#fff',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    Active Now
                  </span>
                )}
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {s.name}
                </span>
                <p style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', fontFamily: 'monospace', margin: '0.15rem 0' }}>
                  {s.label}
                </p>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                  24-Hr: {s.time}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ background: 'var(--bg-main)', padding: '0.9rem 1.15rem', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
          ✅ <strong>Central Automated Dispatch:</strong> Students scanned before 11:00 AM are evaluated against <strong>1st Period (9:00 AM)</strong>; between 11:00 AM and 1:15 PM against <strong>1st Break (11:00 AM)</strong>; between 1:15 PM and 3:00 PM against <strong>Lunch (1:15 PM)</strong>; and from 3:00 PM onwards against <strong>2nd Break (3:00 PM)</strong>. Manual adjustments are no longer required.
        </div>
      </div>

      {/* 2. Calculate Late Duration Simulator Card */}
      <div className="card" style={{ background: 'var(--bg-input)' }}>
        <div className="card-header" style={{ marginBottom: '1.25rem' }}>
          <div>
            <h2 className="card-title" style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calculator size={20} color="var(--accent-cyan)" /> Calculate Late Duration Simulator
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Accurately verify scheduled reporting time vs. student arrival time (handles 12-hour AM/PM, 24-hr, seconds, and early/on-time arrivals).
            </p>
          </div>
        </div>

        {/* Input Controls Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
          {/* Scheduled Time Control */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.4rem' }}>
              Scheduled Reporting Time (e.g. 9:00 AM) *
            </label>
            <input
              type="text"
              className="form-input"
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '1rem' }}
              value={testScheduledTime}
              onChange={(e) => setTestScheduledTime(e.target.value)}
              placeholder="e.g. 9:00 AM, 11:00 AM, 1:15 PM..."
            />
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              {SESSION_TIMINGS.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.6rem',
                    borderColor: testScheduledTime === s.label ? 'var(--primary-500)' : 'var(--border-subtle)',
                    color: testScheduledTime === s.label ? 'var(--primary-400)' : 'var(--text-main)'
                  }}
                  onClick={() => setTestScheduledTime(s.label)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Arrival / Current Time Control */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.4rem' }}>
              Arrival / Current Time (e.g. 9:18 AM) *
            </label>
            <input
              type="text"
              className="form-input"
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '1rem' }}
              value={testArrivalTime}
              onChange={(e) => setTestArrivalTime(e.target.value)}
              placeholder="e.g. 9:18 AM or 09:18:00"
            />
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                onClick={() => setTestArrivalTime('9:18 AM')}
              >
                9:18 AM (18m Late)
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                onClick={() => setTestArrivalTime('1:33 PM')}
              >
                1:33 PM (Lunch Late)
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                onClick={() => {
                  const now = new Date();
                  const h = now.getHours();
                  const m = String(now.getMinutes()).padStart(2, '0');
                  const meridiem = h >= 12 ? 'PM' : 'AM';
                  const dispH = h % 12 || 12;
                  setTestArrivalTime(`${dispH}:${m} ${meridiem}`);
                }}
              >
                Use Current Time
              </button>
            </div>
          </div>
        </div>

        <button type="button" className="btn btn-primary" onClick={handleTestCalculate} style={{ alignSelf: 'flex-start' }}>
          <Calculator size={16} /> Calculate Late Duration
        </button>

        {/* Calculation Result Breakdown Card */}
        {testResult && (
          <div
            style={{
              marginTop: '1.25rem',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              background: testResult.isLate ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.08)',
              border: `1px solid ${testResult.isLate ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.1rem', color: testResult.isLate ? '#f59e0b' : '#10b981' }}>
              {testResult.isLate ? <AlertCircle size={22} /> : <CheckCircle2 size={22} />}
              Result: {testResult.lateMinutes} minute(s) late
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem', marginTop: '0.85rem' }}>
              <div style={{ background: 'var(--bg-main)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Scheduled Time</span>
                <p style={{ fontWeight: 700, fontFamily: 'monospace', color: '#fff', marginTop: '0.2rem' }}>{testResult.scheduled}</p>
              </div>
              <div style={{ background: 'var(--bg-main)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Arrival Time</span>
                <p style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary-400)', marginTop: '0.2rem' }}>{testResult.arrival}</p>
              </div>
              <div style={{ background: 'var(--bg-main)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Late Duration</span>
                <p style={{ fontWeight: 700, color: testResult.isLate ? '#f59e0b' : '#10b981', marginTop: '0.2rem' }}>
                  {testResult.lateMinutes} minutes
                </p>
              </div>
              <div style={{ background: 'var(--bg-main)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dynamic Fine</span>
                <p style={{ fontWeight: 800, color: testResult.isLate ? '#ef4444' : '#10b981', marginTop: '0.2rem' }}>
                  ₹{testResult.fineAmount.toFixed(2)}
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.85rem' }}>
              {testResult.message}
            </p>
          </div>
        )}
      </div>

      {/* 3. Dedicated Presentation & Demo Reset Controls Card */}
      <div className="card" style={{ border: '1px solid rgba(245, 158, 11, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="card-title" style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b' }}>
              <RotateCcw size={18} /> Presentation & Demo Mode Controls
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem', maxWidth: '650px', lineHeight: '1.4' }}>
              The live project protects against duplicate scans and enforces the <strong>4-entries-per-student-per-day rule</strong>.
              Use Demo Reset to safely clear only today's demo scans & test payments for presentations.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            style={{ background: '#f59e0b', borderColor: '#f59e0b', color: '#000', fontWeight: 700 }}
            onClick={() => setIsDemoResetModalOpen(true)}
          >
            <RotateCcw size={16} /> Reset Demo Data
          </button>
        </div>
      </div>

      {/* Demo Reset Confirmation Modal (ONLY on College Settings Page) */}
      <Modal
        isOpen={isDemoResetModalOpen}
        onClose={() => !resettingDemo && setIsDemoResetModalOpen(false)}
        title="Reset Demo Data (Presentations)"
        maxWidth="480px"
      >
        <div>
          <div style={{ marginBottom: '1.25rem' }}>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '0.75rem', lineHeight: '1.5' }}>
              Are you sure you want to reset <strong>today's demo records</strong>?
            </p>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: '8px', padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#92400e', marginBottom: '0.75rem' }}>
              <strong style={{ color: '#78350f' }}>Safe Presentation Reset:</strong>
              <ul style={{ marginTop: '0.35rem', paddingLeft: '1.2rem', lineHeight: '1.4', color: '#92400e' }}>
                <li>Clears only today's demo gate scans and test payment records.</li>
                <li>Allows the same student to be scanned again for demonstration.</li>
                <li><strong>Preserves</strong> all students, original barcodes, staff accounts, fine rules, and college settings.</li>
              </ul>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Real 4-entry-per-day protection remains active for normal production operations.
            </p>
          </div>

          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsDemoResetModalOpen(false)}
              disabled={resettingDemo}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirmDemoReset}
              disabled={resettingDemo}
              style={{ background: '#d97706', borderColor: '#d97706', color: '#ffffff', fontWeight: 600 }}
            >
              {resettingDemo ? 'Resetting Demo Data...' : 'Confirm Demo Reset'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SettingsPage;
