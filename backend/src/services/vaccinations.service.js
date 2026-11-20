const pool = require('../config/db');

const DATE_FIELDS = `
  v.id,
  v.pet_id,
  v.vaccine_type_id,
  vt.name AS vaccine_name,
  DATE_FORMAT(v.given_date, '%Y-%m-%d') AS given_date,
  DATE_FORMAT(v.next_due_date, '%Y-%m-%d') AS next_due_date,
  v.clinic,
  v.note`;

// Pet must belong to the logged-in user and not be soft-deleted
async function findOwnedPet(petId, userId) {
  const [rows] = await pool.query(
    `SELECT id, species_id
     FROM pets
     WHERE id = ? AND user_id = ? AND is_active = TRUE
     LIMIT 1`,
    [petId, userId]
  );

  return rows[0] || null;
}

// Vaccine catalogue for the form (active types, optionally one species)
async function getVaccineTypes(speciesId) {
  const params = [];
  let where = 'WHERE is_active = TRUE';

  if (speciesId) {
    where += ' AND species_id = ?';
    params.push(speciesId);
  }

  const [rows] = await pool.query(
    `SELECT id, name, species_id, interval_days, description
     FROM vaccine_types
     ${where}
     ORDER BY name ASC`,
    params
  );

  return rows;
}

async function findVaccineType(id) {
  const [rows] = await pool.query(
    `SELECT id, name, species_id, interval_days, is_active
     FROM vaccine_types
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

// Vaccination history of one pet, newest first
async function getVaccinationsByPet(petId) {
  const [rows] = await pool.query(
    `SELECT ${DATE_FIELDS}
     FROM vaccinations v
     JOIN vaccine_types vt ON vt.id = v.vaccine_type_id
     WHERE v.pet_id = ?
     ORDER BY v.given_date DESC, v.id DESC`,
    [petId]
  );

  return rows;
}

// A vaccination record, only if its pet belongs to the user (R1)
async function findOwnedVaccination(id, userId) {
  const [rows] = await pool.query(
    `SELECT ${DATE_FIELDS}
     FROM vaccinations v
     JOIN vaccine_types vt ON vt.id = v.vaccine_type_id
     JOIN pets p ON p.id = v.pet_id
     WHERE v.id = ? AND p.user_id = ? AND p.is_active = TRUE
     LIMIT 1`,
    [id, userId]
  );

  return rows[0] || null;
}

async function findVaccination(id) {
  const [rows] = await pool.query(
    `SELECT ${DATE_FIELDS}
     FROM vaccinations v
     JOIN vaccine_types vt ON vt.id = v.vaccine_type_id
     WHERE v.id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function createVaccination(petId, data) {
  const [result] = await pool.query(
    `INSERT INTO vaccinations
      (pet_id, vaccine_type_id, given_date, next_due_date, clinic, note)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      petId,
      data.vaccine_type_id,
      data.given_date,
      data.next_due_date,
      data.clinic,
      data.note,
    ]
  );

  return result.insertId;
}

async function updateVaccination(id, data) {
  const [result] = await pool.query(
    `UPDATE vaccinations
     SET vaccine_type_id = ?,
         given_date = ?,
         next_due_date = ?,
         clinic = ?,
         note = ?
     WHERE id = ?`,
    [
      data.vaccine_type_id,
      data.given_date,
      data.next_due_date,
      data.clinic,
      data.note,
      id,
    ]
  );

  return result.affectedRows > 0;
}

async function deleteVaccination(id) {
  const [result] = await pool.query(
    'DELETE FROM vaccinations WHERE id = ?',
    [id]
  );

  return result.affectedRows > 0;
}

module.exports = {
  findOwnedPet,
  getVaccineTypes,
  findVaccineType,
  getVaccinationsByPet,
  findOwnedVaccination,
  findVaccination,
  createVaccination,
  updateVaccination,
  deleteVaccination,
};
