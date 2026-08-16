/**
 * IST (Indian Standard Time - Asia/Kolkata, UTC+5:30) Time Utilities
 */

/**
 * Returns current Date object converted precisely to Asia/Kolkata IST
 */
export function getISTDate(): Date {
  const now = new Date();
  const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  return new Date(istString);
}

/**
 * Returns today's IST Date string in format YYYY-MM-DD
 */
export function getISTDateString(): string {
  const ist = getISTDate();
  const year = ist.getFullYear();
  const month = String(ist.getMonth() + 1).padStart(2, '0');
  const day = String(ist.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns current IST time in decimal hours (e.g. 11:30 AM IST = 11.5, 7:30 PM IST = 19.5)
 */
export function getISTCurrentDecimalHours(): number {
  const ist = getISTDate();
  return ist.getHours() + ist.getMinutes() / 60;
}

/**
 * Formats a Date / ISO string to standard Indian Standard Time display (e.g., "Aug 16, 01:30 PM IST")
 */
export function formatToIST(dateOrIso: Date | string): string {
  const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}
