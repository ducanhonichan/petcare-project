const pool = require('../config/db');
async function getDashboard(userId) {
  const [[counts], [activities]] = await Promise.all([
    pool.query(`SELECT
      (SELECT COUNT(*) FROM pets WHERE user_id = ? AND is_active = TRUE) AS totalPets,
      (SELECT COUNT(*) FROM weight_logs w JOIN pets p ON p.id = w.pet_id
        WHERE p.user_id = ? AND p.is_active = TRUE) AS totalWeights,
      (SELECT COUNT(*) FROM vet_visits v JOIN pets p ON p.id = v.pet_id
        WHERE p.user_id = ? AND p.is_active = TRUE) AS totalVisits`, [userId, userId, userId]),
    pool.query(`SELECT kind, id, pet_id, pet_name, detail,
        DATE_FORMAT(recorded_at, '%Y-%m-%d') AS record_date
      FROM (
        SELECT 'weight' AS kind, w.id, p.id AS pet_id, p.name AS pet_name,
          CONCAT(w.weight_kg, ' kg') AS detail, w.measured_at AS recorded_at
        FROM weight_logs w JOIN pets p ON p.id = w.pet_id
        WHERE p.user_id = ? AND p.is_active = TRUE
        UNION ALL
        SELECT 'visit', v.id, p.id, p.name, COALESCE(v.reason, v.clinic, 'Veterinary visit'), v.visit_date
        FROM vet_visits v JOIN pets p ON p.id = v.pet_id
        WHERE p.user_id = ? AND p.is_active = TRUE
        UNION ALL
        SELECT 'vaccination', v.id, p.id, p.name, vt.name, v.given_date
        FROM vaccinations v JOIN pets p ON p.id = v.pet_id
        JOIN vaccine_types vt ON vt.id = v.vaccine_type_id
        WHERE p.user_id = ? AND p.is_active = TRUE
      ) AS records
      ORDER BY recorded_at DESC, kind ASC, id DESC LIMIT 8`, [userId, userId, userId]),
  ]);
  const summary = Object.fromEntries(Object.entries(counts[0]).map(([key, value]) => [key, Number(value)]));
  return { summary, activities };
}
module.exports = { getDashboard };
