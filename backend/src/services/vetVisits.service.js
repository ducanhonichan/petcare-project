
const pool = require('../config/db');

// Check whether a pet belongs to the authenticated user
async function checkPetOwnership(petId, userId) {
  const [rows] = await pool.query(
    'SELECT id FROM pets WHERE id = ? AND user_id = ?',
    [petId, userId]
  );

  return rows.length > 0;
}

// Get all veterinary visits for one pet
async function getVisitsByPet(petId) {
  const [rows] = await pool.query(
    `SELECT id, pet_id, visit_date, clinic,
            reason, diagnosis, cost, note
     FROM vet_visits
     WHERE pet_id = ?
     ORDER BY visit_date DESC, id DESC`,
    [petId]
  );

  return rows;
}

// Add a veterinary visit
async function createVisit(petId, data) {
  const {
    visit_date,
    clinic,
    reason,
    diagnosis,
    cost,
    note,
  } = data;

  const [result] = await pool.query(
    `INSERT INTO vet_visits
      (pet_id, visit_date, clinic, reason, diagnosis, cost, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      petId,
      visit_date,
      clinic ?? null,
      reason ?? null,
      diagnosis ?? null,
      cost ?? null,
      note ?? null,
    ]
  );

  return result.insertId;
}

// Delete a veterinary visit
async function deleteVisit(visitId, petId) {
  const [result] = await pool.query(
    'DELETE FROM vet_visits WHERE id = ? AND pet_id = ?',
    [visitId, petId]
  );

  return result.affectedRows > 0;
}

module.exports = {
  checkPetOwnership,
  getVisitsByPet,
  createVisit,
  deleteVisit,
};
