const pool = require('../config/db');

// Kiem tra thu cung co thuoc user va con hoat dong khong
async function findOwnedPet(petId, userId) {
  const [rows] = await pool.query(
    `SELECT id
     FROM pets
     WHERE id = ?
       AND user_id = ?
       AND is_active = TRUE
     LIMIT 1`,
    [petId, userId]
  );

  return rows[0] || null;
}

// Lay lich su can nang cua thu cung
async function getWeightLogs(petId) {
  const [rows] = await pool.query(
    `SELECT id, pet_id, weight_kg, measured_at, note
     FROM weight_logs
     WHERE pet_id = ?
     ORDER BY measured_at DESC, id DESC`,
    [petId]
  );

  return rows;
}

// Them lan can moi
async function createWeightLog(petId, data) {
  const [result] = await pool.query(
    `INSERT INTO weight_logs
       (pet_id, weight_kg, measured_at, note)
     VALUES (?, ?, ?, ?)`,
    [petId, data.weight_kg, data.measured_at, data.note]
  );

  return result.insertId;
}

// Cap nhat lan can
async function updateWeightLog(petId, weightId, data) {
  const [result] = await pool.query(
    `UPDATE weight_logs
     SET weight_kg = ?,
         measured_at = ?,
         note = ?
     WHERE id = ? AND pet_id = ?`,
    [
      data.weight_kg,
      data.measured_at,
      data.note,
      weightId,
      petId,
    ]
  );

  return result.affectedRows > 0;
}

// Xoa lan can
async function deleteWeightLog(petId, weightId) {
  const [result] = await pool.query(
    `DELETE FROM weight_logs
     WHERE id = ? AND pet_id = ?`,
    [weightId, petId]
  );

  return result.affectedRows > 0;
}

module.exports = {
  findOwnedPet,
  getWeightLogs,
  createWeightLog,
  updateWeightLog,
  deleteWeightLog,
};