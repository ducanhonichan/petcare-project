const pool = require('../config/db');

// ---------- Users ----------

async function listUsers() {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.is_banned, u.created_at,
            (SELECT COUNT(*) FROM pets p
              WHERE p.user_id = u.id AND p.is_active = TRUE) AS pet_count
     FROM users u
     ORDER BY u.created_at DESC, u.id DESC`
  );

  return rows.map((row) => ({
    ...row,
    is_banned: Boolean(row.is_banned),
    pet_count: Number(row.pet_count),
  }));
}

async function findUser(id) {
  const [rows] = await pool.query(
    'SELECT id, name, email, role, is_banned FROM users WHERE id = ? LIMIT 1',
    [id]
  );

  return rows[0] || null;
}

async function setUserBanned(id, isBanned) {
  await pool.query('UPDATE users SET is_banned = ? WHERE id = ?', [
    isBanned,
    id,
  ]);
}

// ---------- Vaccine types ----------

const TYPE_FIELDS = `
  vt.id, vt.name, vt.species_id, s.name AS species_name,
  vt.interval_days, vt.description, vt.is_active`;

function mapType(row) {
  return { ...row, is_active: Boolean(row.is_active) };
}

// All types, including hidden ones (the public list only shows active ones)
async function listVaccineTypes() {
  const [rows] = await pool.query(
    `SELECT ${TYPE_FIELDS}
     FROM vaccine_types vt
     JOIN species s ON s.id = vt.species_id
     ORDER BY s.name ASC, vt.name ASC`
  );

  return rows.map(mapType);
}

async function findVaccineType(id) {
  const [rows] = await pool.query(
    `SELECT ${TYPE_FIELDS}
     FROM vaccine_types vt
     JOIN species s ON s.id = vt.species_id
     WHERE vt.id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] ? mapType(rows[0]) : null;
}

async function speciesExists(id) {
  const [rows] = await pool.query('SELECT id FROM species WHERE id = ?', [id]);
  return rows.length > 0;
}

async function createVaccineType(data) {
  const [result] = await pool.query(
    `INSERT INTO vaccine_types (name, species_id, interval_days, description)
     VALUES (?, ?, ?, ?)`,
    [data.name, data.species_id, data.interval_days, data.description]
  );

  return result.insertId;
}

async function updateVaccineType(id, data) {
  await pool.query(
    `UPDATE vaccine_types
     SET name = ?, species_id = ?, interval_days = ?, description = ?,
         is_active = ?
     WHERE id = ?`,
    [
      data.name,
      data.species_id,
      data.interval_days,
      data.description,
      data.is_active,
      id,
    ]
  );
}

// Hide instead of delete so old vaccinations keep their vaccine name
async function hideVaccineType(id) {
  await pool.query('UPDATE vaccine_types SET is_active = FALSE WHERE id = ?', [
    id,
  ]);
}

module.exports = {
  listUsers,
  findUser,
  setUserBanned,
  listVaccineTypes,
  findVaccineType,
  speciesExists,
  createVaccineType,
  updateVaccineType,
  hideVaccineType,
};
