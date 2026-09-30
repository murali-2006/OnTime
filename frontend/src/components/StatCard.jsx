import React from 'react';

const StatCard = ({ title, value, icon: Icon, subtitle, color = 'blue' }) => {
  return (
    <div className="card stat-card">
      <div className="stat-info">
        <span className="stat-label">{title}</span>
        <span className="stat-value">{value}</span>
        {subtitle && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{subtitle}</span>}
      </div>
      {Icon && (
        <div className="stat-icon" style={{ color: color === 'emerald' ? '#10b981' : color === 'amber' ? '#f59e0b' : color === 'purple' ? '#a855f7' : 'var(--primary-500)' }}>
          <Icon size={24} />
        </div>
      )}
    </div>
  );
};

export default StatCard;
