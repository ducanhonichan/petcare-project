const pool = require('../config/db');
const { daysBetween } = require('../utils/dates');

async function getRemindBeforeDays(userId) {
  const [rows] = await pool.query(
    'SELECT remind_before_days FROM users WHERE id = ?',
    [userId]
  );

  return rows[0] ? rows[0].remind_before_days : 7;
}

// R5: for each (pet, vaccine type) only the most recent dose counts, so an
// old dose is not reminded again once the pet has been vaccinated again.
// Only active pets of this user. Doses without next_due_date are skipped.
async function getLatestDoses(userId) {
  const [rows] = await pool.query(
    `SELECT *
     FROM (
       SELECT v.id AS vaccination_id,
              v.pet_id,
              p.name AS pet_name,
              v.vaccine_type_id,
              vt.name AS vaccine_name,
              DATE_FORMAT(v.given_date, '%Y-%m-%d') AS given_date,
              DATE_FORMAT(v.next_due_date, '%Y-%m-%d') AS next_due_date,
              v.clinic,
              ROW_NUMBER() OVER (
                PARTITION BY v.pet_id, v.vaccine_type_id
                ORDER BY v.given_date DESC, v.id DESC
              ) AS rn
       FROM vaccinations v
       JOIN pets p ON p.id = v.pet_id
       JOIN vaccine_types vt ON vt.id = v.vaccine_type_id
       WHERE p.user_id = ? AND p.is_active = TRUE
     ) latest
     WHERE latest.rn = 1 AND latest.next_due_date IS NOT NULL
     ORDER BY latest.next_due_date ASC, latest.vaccination_id ASC`,
    [userId]
  );

  return rows.map(({ rn, ...dose }) => dose);
}

// R4: classify one dose.
//   OVERDUE : next_due_date < today
//   DUE_SOON: 0 <= next_due_date - today <= windowDays
//   LATER   : everything else
function classify(nextDueDate, today, windowDays) {
  const daysUntilDue = daysBetween(today, nextDueDate);

  let status = 'LATER';

  if (daysUntilDue < 0) status = 'OVERDUE';
  else if (daysUntilDue <= windowDays) status = 'DUE_SOON';

  return { status, days_until_due: daysUntilDue };
}

module.exports = { getRemindBeforeDays, getLatestDoses, classify };
