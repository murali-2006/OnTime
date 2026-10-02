/**
 * Shared Time and Session Utilities for OnTime
 * Centralizes session timings, time parsing, and late duration calculations.
 */

// Retain ONLY these four exact session timings
export const SESSION_TIMINGS = [
  { name: '1st Period', time: '09:00:00', label: '9:00 AM' },
  { name: '1st Break', time: '11:00:00', label: '11:00 AM' },
  { name: 'Lunch', time: '13:15:00', label: '1:15 PM' },
  { name: '2nd Break', time: '15:00:00', label: '3:00 PM' }
];

/**
 * Robustly parses any time representation into minutes from midnight (0 - 1439).
 * Handles:
 * - 12-hour format with AM/PM: "9:00 AM", "09:18 AM", "1:15 PM", "3:00 PM", "12:00 PM", "12:30 AM"
 * - 24-hour format: "09:00", "09:18:25", "13:15:00", "15:00:00"
 * - ISO string: "2026-10-02T09:18:00.000Z"
 * - Date object
 *
 * @param {string|Date} timeInput
 * @returns {number} minutes from midnight (0 - 1439)
 */
export const parseTimeToMinutes = (timeInput) => {
  if (!timeInput && timeInput !== 0) return 0;

  if (timeInput instanceof Date) {
    return timeInput.getHours() * 60 + timeInput.getMinutes();
  }

  const str = String(timeInput).trim();

  // ISO date string handling
  if (str.includes('T')) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.getHours() * 60 + d.getMinutes();
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

/**
 * Centrally determine the applicable session for a given time
 * Retains strictly the four college sessions:
 * - Before 11:00 AM -> 1st Period (9:00 AM)
 * - 11:00 AM to 1:15 PM -> 1st Break (11:00 AM)
 * - 1:15 PM to 3:00 PM -> Lunch (1:15 PM)
 * - 3:00 PM onwards -> 2nd Break (3:00 PM)
 *
 * @param {string|Date} timeInput
 * @returns {{ name: string, time: string, label: string }}
 */
export const getSessionForTime = (timeInput = new Date()) => {
  const mins = parseTimeToMinutes(timeInput);
  const break1Mins = parseTimeToMinutes('11:00:00'); // 660 mins
  const lunchMins = parseTimeToMinutes('13:15:00');  // 795 mins
  const break2Mins = parseTimeToMinutes('15:00:00'); // 900 mins

  if (mins < break1Mins) {
    return SESSION_TIMINGS[0]; // 1st Period (9:00 AM)
  } else if (mins < lunchMins) {
    return SESSION_TIMINGS[1]; // 1st Break (11:00 AM)
  } else if (mins < break2Mins) {
    return SESSION_TIMINGS[2]; // Lunch (1:15 PM)
  } else {
    return SESSION_TIMINGS[3]; // 2nd Break (3:00 PM)
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
export const calculateLateDuration = (scheduledTime, arrivalTime) => {
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
 * Format total minutes from midnight to HH:MM format
 * @param {number} totalMinutes
 * @returns {string} e.g. "09:18"
 */
export const formatMinutesToHHMM = (totalMinutes) => {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
