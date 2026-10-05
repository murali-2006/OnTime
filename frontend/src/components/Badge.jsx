import React from 'react';

const Badge = ({ status, text }) => {
  const normalizedStatus = (status || '').toUpperCase();
  const displayText = text || normalizedStatus;

  let badgeClass = 'badge-inactive';
  if (normalizedStatus === 'PAID' || normalizedStatus === 'SUCCESS') {
    badgeClass = 'badge-paid';
  } else if (normalizedStatus === 'PENDING' || normalizedStatus === 'CREATED') {
    badgeClass = 'badge-pending';
  } else if (normalizedStatus === 'FAILED' || normalizedStatus === 'INACTIVE' || normalizedStatus === 'REJECTED') {
    badgeClass = 'badge-failed';
  } else if (normalizedStatus === 'ACTIVE') {
    badgeClass = 'badge-active';
  } else if (normalizedStatus === 'WAIVED') {
    badgeClass = 'badge-waived';
  }

  return (
    <span className={`badge ${badgeClass}`}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'currentColor' }} />
      {displayText}
    </span>
  );
};

export default Badge;
