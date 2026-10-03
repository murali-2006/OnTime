/**
 * Centralized Indian Standard Time (Asia/Kolkata) Utility for OnTime
 * Ensures all user-facing times, session checks, and today date strings
 * are strictly timezone-aware in Asia/Kolkata without hardcoding offsets.
 */

const TIMEZONE = 'Asia/Kolkata';

/**
 * Returns date and time components in Asia/Kolkata timezone
 * @param {Date|string|number} dateOrStr
 * @returns {{ hour: number, minute: number, second: number, year: string, month: string, day: string, dateStr: string }}
 */
const getIndiaTimeParts = (dateOrStr = new Date()) => {
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
const getIndiaTodayStr = (date = new Date()) => {
  return getIndiaTimeParts(date).dateStr;
};

/**
 * Format any time, ISO string, Date object, or HH:mm:ss to 12-hour AM/PM in Asia/Kolkata.
 * Examples: "9:00 AM", "11:00 AM", "1:15 PM", "3:00 PM", "10:59 AM"
 * @param {string|Date} timeInput
 * @returns {string}
 */
const format12HourTime = (timeInput) => {
  if (!timeInput && timeInput !== 0) return '';

  if (timeInput instanceof Date) {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: TIMEZONE,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(timeInput);
  }

  const str = String(timeInput).trim();

  // If already contains AM/PM, normalize spacing and case
  if (/AM|PM/i.test(str)) {
    const match = str.match(/^0?(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
    if (match) {
      return `${parseInt(match[1], 10)}:${match[2]} ${match[3].toUpperCase()}`;
    }
    return str;
  }

  // If ISO date string (contains T or Z)
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
 * Format Date object to HH:mm:ss in Asia/Kolkata timezone
 * @param {Date} date
 * @returns {string}
 */
const formatIndiaTimeString = (date = new Date()) => {
  const { hour, minute, second } = getIndiaTimeParts(date);
  const pad = (num) => String(num).padStart(2, '0');
  return `${pad(hour)}:${pad(minute)}:${pad(second)}`;
};

module.exports = {
  TIMEZONE,
  getIndiaTimeParts,
  getIndiaTodayStr,
  format12HourTime,
  formatIndiaTimeString
};
