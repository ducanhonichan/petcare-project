
const pool = require('../config/db');

// Kiểm tra pet có thuộc user và còn hoạt động hay không
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

// Lấy lịch sử cân nặng của pet
async function getWeightLogs(petId) {
  const [rows] = await pool.query(
    `SELECT id, pet_id, weight_kg, DATE_FORMAT(measured_at, '%Y-%m-%d %H:%i:%s') AS measured_at, note
     FROM weight_logs
     WHERE pet_id = ?
     ORDER BY measured_at DESC, id DESC`,
    [petId]
  );

  return rows;
}

// Tìm một lần cân theo ID và pet ID
async function findWeightLog(petId, weightId) {
  const [rows] = await pool.query(
    `SELECT id, pet_id, weight_kg, DATE_FORMAT(measured_at, '%Y-%m-%d %H:%i:%s') AS measured_at, note
     FROM weight_logs
     WHERE id = ? AND pet_id = ?
     LIMIT 1`,
    [weightId, petId]
  );

  return rows[0] || null;
}

// Serialize writers for a pet so two simultaneous requests cannot insert the same day.
// No migration or removal of existing records is required.
async function saveWeightLog(petId, data, weightId = null) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [pets] = await connection.query(
      'SELECT id FROM pets WHERE id = ? AND is_active = TRUE FOR UPDATE', [petId]
    );
    if (!pets.length) throw Object.assign(new Error('Pet not found'), { code: 'PET_NOT_FOUND' });

    const startOfDay = data.measured_at.slice(0, 10) + ' 00:00:00';
    const [duplicates] = await connection.query(
      `SELECT id FROM weight_logs
       WHERE pet_id = ? AND measured_at >= ?
         AND measured_at < DATE_ADD(?, INTERVAL 1 DAY) AND id <> ?
       LIMIT 1 FOR UPDATE`,
      [petId, startOfDay, startOfDay, weightId ?? 0]
    );
    if (duplicates.length) {
      throw Object.assign(new Error('A weight record already exists for this day.'), { code: 'ER_DUP_ENTRY' });
    }

    let result;
    if (weightId === null) {
      [result] = await connection.query(
        'INSERT INTO weight_logs (pet_id, weight_kg, measured_at, note) VALUES (?, ?, ?, ?)',
        [petId, data.weight_kg, data.measured_at, data.note ?? null]
      );
    } else {
      [result] = await connection.query(
        'UPDATE weight_logs SET weight_kg = ?, measured_at = ?, note = ? WHERE id = ? AND pet_id = ?',
        [data.weight_kg, data.measured_at, data.note ?? null, weightId, petId]
      );
    }
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function createWeightLog(petId, data) {
  const result = await saveWeightLog(petId, data);
  return result.insertId;
}

async function updateWeightLog(petId, weightId, data) {
  await saveWeightLog(petId, data, weightId);
  // An unchanged update is still valid; affectedRows may be zero.
  return findWeightLog(petId, weightId);
}

// Xóa lần cân
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
  findWeightLog,
  createWeightLog,
  updateWeightLog,
  deleteWeightLog,
};
