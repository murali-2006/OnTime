import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Plus,
  Edit3,
  Power,
  AlertCircle,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import api from '../../services/api';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import Toast from '../../components/Toast';

const FineRulesManagement = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  const [formData, setFormData] = useState({
    minMinutes: '',
    maxMinutes: '',
    fineAmount: '',
    active: true
  });
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/fine-rules');
      if (res.success) {
        setRules(res.rules);
      }
    } catch (err) {
      setToastMessage({ message: err.message || 'Failed to fetch fine rules.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleOpenAdd = () => {
    setEditingRule(null);
    setFormData({
      minMinutes: '',
      maxMinutes: '',
      fineAmount: '',
      active: true
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rule) => {
    setEditingRule(rule);
    setFormData({
      minMinutes: rule.min_minutes,
      maxMinutes: rule.max_minutes !== null ? rule.max_minutes : '',
      fineAmount: rule.fine_amount,
      active: rule.active
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const payload = {
      minMinutes: parseInt(formData.minMinutes, 10),
      maxMinutes: formData.maxMinutes !== '' ? parseInt(formData.maxMinutes, 10) : null,
      fineAmount: parseFloat(formData.fineAmount),
      active: formData.active
    };

    try {
      if (editingRule) {
        const res = await api.put(`/admin/fine-rules/${editingRule.id}`, payload);
        if (res.success) {
          setIsModalOpen(false);
          setToastMessage({ message: 'Fine rule updated successfully!', type: 'success' });
          fetchRules();
        }
      } else {
        const res = await api.post('/admin/fine-rules', payload);
        if (res.success) {
          setIsModalOpen(false);
          setToastMessage({ message: 'New fine rule created successfully!', type: 'success' });
          fetchRules();
        }
      }
    } catch (err) {
      setFormError(err.message || 'Operation failed. Ensure rule does not overlap with existing ranges.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (rule) => {
    const nextActive = !rule.active;
    try {
      const res = await api.patch(`/admin/fine-rules/${rule.id}/status`, { active: nextActive });
      if (res.success) {
        setToastMessage({ message: res.message, type: 'success' });
        fetchRules();
      }
    } catch (err) {
      setToastMessage({ message: err.message || 'Failed to update rule status.', type: 'error' });
    }
  };

  const formatDuration = (min, max) => {
    if (max === null || max === undefined) {
      return `${min}+ minutes`;
    }
    return `${min} – ${max} minutes`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Fine Rules Configuration</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Set automated fine amounts based on late arrival duration brackets
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> Add New Rule
        </button>
      </div>

      {/* Policy Advisory Card */}
      <div className="card" style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <HelpCircle size={20} color="var(--primary-400)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            <strong style={{ color: '#fff' }}>Automated Calculation Principle:</strong> The server computes exact late minutes by subtracting configured reporting time from arrival time. The matching active fine rule bracket is applied. Leave <code style={{ color: 'var(--accent-cyan)' }}>Maximum Minutes</code> blank for open-ended brackets (e.g. 61+ minutes). Overlapping active intervals are strictly rejected.
          </div>
        </div>
      </div>

      {/* Rules Table */}
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Rule ID</th>
                <th>Late Duration Bracket</th>
                <th>Fine Amount</th>
                <th>Status</th>
                <th>Created At</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    Loading fine rules...
                  </td>
                </tr>
              ) : rules.length > 0 ? (
                rules.map((rule) => (
                  <tr key={rule.id}>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-dim)' }}>#{rule.id}</td>
                    <td style={{ fontWeight: 600 }}>
                      <span style={{ color: '#fff' }}>{formatDuration(rule.min_minutes, rule.max_minutes)}</span>
                    </td>
                    <td style={{ fontWeight: 700, fontSize: '1.05rem', color: '#10b981' }}>
                      ₹{parseFloat(rule.fine_amount).toFixed(2)}
                    </td>
                    <td>
                      <Badge status={rule.active ? 'ACTIVE' : 'INACTIVE'} />
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {new Date(rule.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenEdit(rule)}
                          title="Edit Rule"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${rule.active ? 'btn-secondary' : 'btn-primary'}`}
                          onClick={() => handleToggleStatus(rule)}
                          title={rule.active ? 'Deactivate Rule' : 'Activate Rule'}
                        >
                          <Power size={14} color={rule.active ? '#ef4444' : '#10b981'} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                    No fine rules configured. Add rules to enable automatic fine calculation.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Rule Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRule ? `Edit Rule #${editingRule.id}` : 'Create New Fine Rule'}
        maxWidth="500px"
      >
        <form onSubmit={handleSubmit}>
          {formError && (
            <div style={{ background: 'var(--status-failed-bg)', color: '#fca5a5', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
              {formError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Min Minutes *</label>
              <input
                type="number"
                min="1"
                className="form-input"
                placeholder="e.g. 11"
                value={formData.minMinutes}
                onChange={(e) => setFormData({ ...formData, minMinutes: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Max Minutes</label>
              <input
                type="number"
                min={formData.minMinutes || 1}
                className="form-input"
                placeholder="Empty for 61+ min"
                value={formData.maxMinutes}
                onChange={(e) => setFormData({ ...formData, maxMinutes: e.target.value })}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                Leave empty for no upper limit
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Fine Amount (₹) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="form-input"
              placeholder="e.g. 20.00"
              value={formData.fineAmount}
              onChange={(e) => setFormData({ ...formData, fineAmount: e.target.value })}
              required
            />
          </div>

          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
            <input
              type="checkbox"
              id="activeCheck"
              style={{ width: 18, height: 18, cursor: 'pointer' }}
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
            />
            <label htmlFor="activeCheck" style={{ fontSize: '0.9rem', color: '#fff', cursor: 'pointer' }}>
              Rule is Active and in effect
            </label>
          </div>

          <div className="modal-footer" style={{ padding: '1rem 0 0 0', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingRule ? 'Update Rule' : 'Create Rule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FineRulesManagement;
