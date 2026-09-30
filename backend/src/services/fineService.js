const { settingsRepository, fineRulesRepository } = require('../db/repositories/firestoreRepository');

/**
 * Convert HH:mm:ss or HH:mm string to minutes from midnight
 * @param {string} timeStr - e.g. "09:17:00"
 * @returns {number}
 */
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const parts = timeStr.toString().split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
};

/**
 * Format Date object to HH:mm:ss in local/server time
 * @param {Date} date
 * @returns {string}
 */
const formatTimeString = (date = new Date()) => {
  const pad = (num) => String(num).padStart(2, '0');
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${hours}:${minutes}:${seconds}`;
};

// Configured College Session Timings
const SESSION_TIMINGS = [
  { name: '1st Period', time: '09:00:00', label: '9:00 AM' },
  { name: '1st Break', time: '11:00:00', label: '11:00 AM' },
  { name: 'Lunch', time: '13:15:00', label: '1:15 PM' },
  { name: '2nd Break', time: '15:00:00', label: '3:00 PM' }
];

/**
 * Get the applicable session for a given arrival time
 * @param {string} timeStr - e.g. "09:17:00"
 * @returns {{ name: string, time: string, label: string }}
 */
const getSessionForTime = (timeStr) => {
  const mins = timeToMinutes(timeStr);
  if (mins < timeToMinutes('11:00:00')) {
    return SESSION_TIMINGS[0]; // 1st Period -> 9:00 AM
  } else if (mins < timeToMinutes('13:15:00')) {
    return SESSION_TIMINGS[1]; // 1st Break -> 11:00 AM
  } else if (mins < timeToMinutes('15:00:00')) {
    return SESSION_TIMINGS[2]; // Lunch -> 1:15 PM
  } else {
    return SESSION_TIMINGS[3]; // 2nd Break -> 3:00 PM
  }
};

/**
 * Get college settings from Firestore (reporting time, late enabled status, and session timings)
 */
const getCollegeSettings = async () => {
  return await settingsRepository.getSettings();
};

/**
 * Calculate late minutes and applicable fine amount based on database rules
 * @param {string} reportingTime - e.g. '09:00:00'
 * @param {string} arrivalTime - e.g. '09:17:00'
 * @returns {Promise<{ lateMinutes: number, fineAmount: number, isLate: boolean, ruleId: number|null }>}
 */
const calculateFine = async (reportingTime, arrivalTime) => {
  const repMins = timeToMinutes(reportingTime);
  const arrMins = timeToMinutes(arrivalTime);

  const diffMins = arrMins - repMins;

  // On time or arrived early
  if (diffMins <= 0) {
    return {
      lateMinutes: 0,
      fineAmount: 0.00,
      isLate: false,
      ruleId: null
    };
  }

  const lateMinutes = diffMins;

  // Query active fine rules ordered by min_minutes from Firestore
  const rules = await fineRulesRepository.findActive();

  let fineAmount = 0.00;
  let ruleId = null;

  for (const rule of rules) {
    const min = parseInt(rule.min_minutes, 10);
    const max = rule.max_minutes !== null ? parseInt(rule.max_minutes, 10) : Infinity;

    if (lateMinutes >= min && lateMinutes <= max) {
      fineAmount = parseFloat(rule.fine_amount);
      ruleId = rule.id;
      break;
    }
  }

  return {
    lateMinutes,
    fineAmount,
    isLate: true,
    ruleId
  };
};

module.exports = {
  timeToMinutes,
  formatTimeString,
  calculateFine,
  getCollegeSettings,
  SESSION_TIMINGS,
  getSessionForTime
};
