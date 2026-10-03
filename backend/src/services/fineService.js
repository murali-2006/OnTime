const { settingsRepository, fineRulesRepository } = require('../db/repositories/firestoreRepository');
const {
  TIMEZONE,
  getIndiaTimeParts,
  getIndiaTodayStr,
  format12HourTime,
  formatIndiaTimeString
} = require('../utils/indiaTime');

/**
 * Robustly parses any time representation into minutes from midnight (0 - 1439) in Asia/Kolkata.
 * Handles:
 * - 12-hour format with AM/PM: "9:00 AM", "09:18 AM", "1:15 PM", "3:00 PM", "12:00 PM", "12:30 AM"
 * - 24-hour format: "09:00", "09:18:25", "13:15:00", "15:00:00"
 * - ISO string: "2026-10-02T09:18:00.000Z" (evaluated in Asia/Kolkata)
 * - Date object (evaluated in Asia/Kolkata)
 *
 * @param {string|Date} timeInput
 * @returns {number} minutes from midnight (0 - 1439)
 */
const parseTimeToMinutes = (timeInput) => {
  if (!timeInput && timeInput !== 0) return 0;

  if (timeInput instanceof Date) {
    const { hour, minute } = getIndiaTimeParts(timeInput);
    return hour * 60 + minute;
  }

  const str = String(timeInput).trim();

  // ISO date string handling - evaluate strictly in Asia/Kolkata
  if (str.includes('T') || str.endsWith('Z')) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const { hour, minute } = getIndiaTimeParts(d);
      return hour * 60 + minute;
    }
  }

  // Regex to match 12-hour or 24-hour time strings
  // Groups: 1=hours, 2=minutes, 3=seconds (optional), 4=AM/PM (optional)
  const match = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?$/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const meridiem = match[4] ? match[4].toUpperCase() : null;

    if (meridiem) {
      if (meridiem === 'PM' && hours < 12) {
        hours += 12;
      } else if (meridiem === 'AM' && hours === 12) {
        hours = 0;
      }
    }

    return hours * 60 + minutes;
  }

  // Fallback: simple colon split
  const parts = str.split(':');
  if (parts.length >= 2) {
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    return hours * 60 + minutes;
  }

  return 0;
};

// Backward-compatible alias
const timeToMinutes = parseTimeToMinutes;

/**
 * Format Date object to 12-hour AM/PM string in Asia/Kolkata (IST)
 * @param {Date|string} date
 * @returns {string} e.g. "10:59 AM"
 */
const formatTimeString = (date = new Date()) => {
  return format12HourTime(date);
};

// Retain ONLY these four exact session timings
const SESSION_TIMINGS = [
  { name: '1st Period', time: '09:00:00', label: '9:00 AM' },
  { name: '1st Break', time: '11:00:00', label: '11:00 AM' },
  { name: 'Lunch', time: '13:15:00', label: '1:15 PM' },
  { name: '2nd Break', time: '15:00:00', label: '3:00 PM' }
];

/**
 * Centrally determine the applicable session for a given arrival time.
 * Retains strictly the four college sessions:
 * - Before 11:00 AM -> 1st Period (9:00 AM)
 * - 11:00 AM to 1:15 PM -> 1st Break (11:00 AM)
 * - 1:15 PM to 3:00 PM -> Lunch (1:15 PM)
 * - 3:00 PM onwards -> 2nd Break (3:00 PM)
 *
 * @param {string|Date} timeInput - e.g. "09:18:00" or new Date()
 * @returns {{ name: string, time: string, label: string }}
 */
const getSessionForTime = (timeInput) => {
  const mins = parseTimeToMinutes(timeInput);
  const break1Mins = parseTimeToMinutes('11:00:00'); // 660 mins
  const lunchMins = parseTimeToMinutes('13:15:00');  // 795 mins
  const break2Mins = parseTimeToMinutes('15:00:00'); // 900 mins

  if (mins < break1Mins) {
    return SESSION_TIMINGS[0]; // 1st Period -> 9:00 AM
  } else if (mins < lunchMins) {
    return SESSION_TIMINGS[1]; // 1st Break -> 11:00 AM
  } else if (mins < break2Mins) {
    return SESSION_TIMINGS[2]; // Lunch -> 1:15 PM
  } else {
    return SESSION_TIMINGS[3]; // 2nd Break -> 3:00 PM
  }
};

/**
 * Calculate late duration accurately between scheduled time and arrival time.
 * Handles AM/PM, 24-hr, seconds, negative values.
 *
 * Example:
 * Scheduled time = 9:00 AM
 * Arrival time = 9:18 AM
 * Result = 18 minutes
 *
 * @param {string|Date} scheduledTime
 * @param {string|Date} arrivalTime
 * @returns {{ lateMinutes: number, isLate: boolean, scheduledMinutes: number, arrivalMinutes: number }}
 */
const calculateLateDuration = (scheduledTime, arrivalTime) => {
  const schedMins = parseTimeToMinutes(scheduledTime);
  const arrMins = parseTimeToMinutes(arrivalTime);

  const diffMins = arrMins - schedMins;

  if (diffMins <= 0) {
    return {
      scheduledMinutes: schedMins,
      arrivalMinutes: arrMins,
      lateMinutes: 0,
      isLate: false
    };
  }

  return {
    scheduledMinutes: schedMins,
    arrivalMinutes: arrMins,
    lateMinutes: diffMins,
    isLate: true
  };
};

/**
 * Get college settings from Firestore (reporting time, late enabled status, and session timings)
 */
const getCollegeSettings = async () => {
  return await settingsRepository.getSettings();
};

/**
 * Calculate late minutes and applicable fine amount based on database rules
 * @param {string} reportingTime - e.g. '09:00:00' or '9:00 AM'
 * @param {string} arrivalTime - e.g. '09:18:00' or '9:18 AM'
 * @returns {Promise<{ lateMinutes: number, fineAmount: number, isLate: boolean, ruleId: number|null }>}
 */
const calculateFine = async (reportingTime, arrivalTime) => {
  const { lateMinutes, isLate } = calculateLateDuration(reportingTime, arrivalTime);

  // On time or arrived early
  if (!isLate || lateMinutes <= 0) {
    return {
      lateMinutes: 0,
      fineAmount: 0.00,
      isLate: false,
      ruleId: null
    };
  }

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
  parseTimeToMinutes,
  calculateLateDuration,
  formatTimeString,
  calculateFine,
  getCollegeSettings,
  SESSION_TIMINGS,
  getSessionForTime,
  format12HourTime,
  getIndiaTodayStr,
  getIndiaTimeParts,
  TIMEZONE
};

