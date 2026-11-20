// Small date helpers. Dates are plain 'YYYY-MM-DD' strings everywhere,
// so there is no time zone conversion between MySQL, the API and React.

function pad(n) {
  return String(n).padStart(2, '0');
}

// Today as 'YYYY-MM-DD' in the server's local time zone
function todayString(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// True for a real calendar date written as YYYY-MM-DD
function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);

  if (year < 1900) return false;

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// 'YYYY-MM-DD' + n days -> 'YYYY-MM-DD'
function addDays(value, days) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));

  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

// Whole days from a to b (b - a). Negative when b is before a.
function daysBetween(a, b) {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);

  return Math.round(
    (Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000
  );
}

module.exports = { todayString, isValidDate, addDays, daysBetween };
