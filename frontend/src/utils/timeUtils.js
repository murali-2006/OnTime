/**
 * Shared Time and Session Utilities for OnTime
 * Centralizes Asia/Kolkata timezone handling, 12-hour AM/PM formatting,
 * session timings, time parsing, and late duration calculations.
 */

export const TIMEZONE = 'Asia/Kolkata';

// Retain ONLY these four exact session timings
export const SESSION_TIMINGS = [
  { name: '1st Period', time: '09:00:00', label: '9:00 AM' },
  { name: '1st Break', time: '11:00:00', label: '11:00 AM' },
  { name: 'Lunch', time: '13:15:00', label: '1:15 PM' },
  { name: '2nd Break', time: '15:00:00', label: '3:00 PM' }
];

/**
 * Returns date and time components in Asia/Kolkata timezone
 * @param {Date|string|number} dateOrStr
 * @returns {{ hour: number, minute: number, second: number, year: string, month: string, day: string, dateStr: string }}
 */
export const getIndiaTimeParts = (dateOrStr = new Date()) => {
  const d = dateOrStr instanceof Date ? dateOrStr : new Date(dateOrStr);
  const validDate = isNaN(d.getTime()) ? new Date() : d;

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const parts = formatter.formatToParts(validDate);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const hour = parseInt(get('hour'), 10) || 0;
  const minute = parseInt(get('minute'), 10) || 0;
  const second = parseInt(get('second'), 10) || 0;
  const year = get('year');
  const month = get('month');
  const day = get('day');
  return {
    hour,
    minute,
    second,
    year,
    month,
    day,
    dateStr: `${year}-${month}-${day}`
  };
};

/**
 * Returns today's date formatted as YYYY-MM-DD in Asia/Kolkata
 * @param {Date|string|number} [date]
 * @returns {string} e.g. "2026-10-03"
 */
export const getIndiaTodayStr = (date = new Date()) => {
  return getIndiaTimeParts(date).dateStr;
};

/**
 * Format any time representation, ISO timestamp, Date object, or HH:mm:ss to 12-hour AM/PM in Asia/Kolkata.
 * Examples:
 * - "09:00:00" -> "9:00 AM"
 * - "11:00:00" -> "11:00 AM"
 * - "13:15:00" -> "1:15 PM"
 * - "15:00:00" -> "3:00 PM"
 * - "10:59:00" -> "10:59 AM"
 * - "2026-10-03T05:29:00.000Z" -> "10:59 AM"
 *
 * @param {string|Date|number} timeInput
 * @returns {string} e.g. "9:00 AM", "1:15 PM"
 */
export const formatISTTime = (timeInput) => {
  if (!timeInput && timeInput !== 0) return '';

  if (timeInput instanceof Date) {
    if (isNaN(timeInput.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', {
      timeZone: TIMEZONE,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(timeInput);
  }

  const str = String(timeInput).trim();

  // If already contains AM/PM, normalize formatting (no leading zero on hour, clean space)
  if (/AM|PM/i.test(str)) {
    const match = str.match(/^0?(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
    if (match) {
      return `${parseInt(match[1], 10)}:${match[2]} ${match[3].toUpperCase()}`;
    }
    return str;
  }

  // If ISO date string (contains T or ends with Z)
  if (str.includes('T') || str.endsWith('Z')) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: TIMEZONE,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(d);
    }
  }

  // If "HH:mm:ss" or "HH:mm" (24-hour string)
  const match24 = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match24) {
    let hour = parseInt(match24[1], 10);
    const minute = match24[2];
    const meridiem = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${meridiem}`;
  }

  return str;
};

/**
 * Format date string or timestamp to readable date in Asia/Kolkata.
 * Examples: "2026-10-03", "3 Oct 2026"
 * @param {string|Date} dateInput
 * @returns {string}
 */
export const formatISTDate = (dateInput) => {
  if (!dateInput) return '';
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    return dateInput.trim();
  }
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) {
    return String(dateInput).split('T')[0];
  }
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(d);
};

/**
 * Format timestamp into combined date and 12-hour AM/PM time in Asia/Kolkata.
 * Example: "3 Oct 2026, 10:59 AM"
 * @param {string|Date} dateOrTimestamp
 * @returns {string}
 */
export const formatISTDateTime = (dateOrTimestamp) => {
  if (!dateOrTimestamp) return '';
  const d = dateOrTimestamp instanceof Date ? dateOrTimestamp : new Date(dateOrTimestamp);
  if (isNaN(d.getTime())) return String(dateOrTimestamp);

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(d);
};

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
export const parseTimeToMinutes = (timeInput) => {
  if (!timeInput && timeInput !== 0) return 0;

  if (timeInput instanceof Date) {
    const { hour, minute } = getIndiaTimeParts(timeInput);
    return hour * 60 + minute;
  }

  const str = String(timeInput).trim();

  // ISO date string handling - evaluate in Asia/Kolkata
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
  const break1Mins = parseTimeToMinutes('11:00:00'); // 660 mins (11:00 AM)
  const lunchMins = parseTimeToMinutes('13:15:00');  // 795 mins (1:15 PM)
  const break2Mins = parseTimeToMinutes('15:00:00'); // 900 mins (3:00 PM)

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
 * Arrival time = 10:59 AM
 * Result = 119 minutes
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
