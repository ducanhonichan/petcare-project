
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
    `SELECT id, pet_id, weight_kg, measured_at, note
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
    `SELECT id, pet_id, weight_kg, measured_at, note
     FROM weight_logs
     WHERE id = ? AND pet_id = ?
     LIMIT 1`,
    [weightId, petId]
  );

  return rows[0] || null;
}

// Thêm lần cân mới
async function createWeightLog(petId, data) {
  const [result] = await pool.query(
    `INSERT INTO weight_logs
       (pet_id, weight_kg, measured_at, note)
     VALUES (?, ?, ?, ?)`,
    [
      petId,
      data.weight_kg,
      data.measured_at,
      data.note ?? null,
    ]
  );

  return result.insertId;
}

// Cập nhật lần cân
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
      data.note ?? null,
      weightId,
      petId,
    ]
  );

  // Không dựa vào affectedRows để kết luận bản ghi có tồn tại,
  // vì MySQL có thể trả 0 nếu dữ liệu mới giống dữ liệu cũ.
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
