const pool = require('../config/db');

// Lay danh sach thu cung theo chu so huu
async function getPetsByUserId(userId) {
  const [rows] = await pool.query(
    `SELECT id, name, species_id, breed, gender,
            birth_date, color, avatar_url, note, created_at
     FROM pets
     WHERE user_id = ? AND is_active = TRUE
     ORDER BY created_at DESC, id DESC`,
    [userId]
  );

  return rows;
}








// Them thu cung moi cho nguoi dung da xac thuc
async function createPet(userId, petData) {
  const {
    name,
    species_id,
    breed = null,
    gender = 'UNKNOWN',
    birth_date = null,
    color = null,
    avatar_url = null,
    note = null,
  } = petData;

  const [result] = await pool.query(
    `INSERT INTO pets
      (user_id, name, species_id, breed, gender,
       birth_date, color, avatar_url, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      name,
      species_id,
      breed,
      gender,
      birth_date,
      color,
      avatar_url,
      note,
    ]
  );

  return result.insertId;
}





// Lay chi tiet thu cung theo ID va chu so huu
async function getPetById(petId, userId) {
  const [rows] = await pool.query(
    `SELECT id, name, species_id, breed, gender,
            birth_date, color, avatar_url, note, created_at
     FROM pets
     WHERE id = ?
       AND user_id = ?
       AND is_active = TRUE
     LIMIT 1`,
    [petId, userId]
  );

  return rows[0] || null;
}






// Cap nhat thong tin thu cung cua chu so huu
async function updatePet(petId, userId, petData) {
  const {
    name,
    species_id,
    breed = null,
    gender = 'UNKNOWN',
    birth_date = null,
    color = null,
    avatar_url = null,
    note = null,
  } = petData;

  const [result] = await pool.query(
    `UPDATE pets
     SET name = ?,
         species_id = ?,
         breed = ?,
         gender = ?,
         birth_date = ?,
         color = ?,
         avatar_url = ?,
         note = ?
     WHERE id = ?
       AND user_id = ?
       AND is_active = TRUE`,
    [
      name,
      species_id,
      breed,
      gender,
      birth_date,
      color,
      avatar_url,
      note,
      petId,
      userId,
    ]
  );

  return result.affectedRows > 0;
}






// Xoa mem thu cung cua chu so huu
async function softDeletePet(petId, userId) {
  const [result] = await pool.query(
    `UPDATE pets
     SET is_active = FALSE
     WHERE id = ?
       AND user_id = ?
       AND is_active = TRUE`,
    [petId, userId]
  );

  return result.affectedRows > 0;
}







module.exports = {
  getPetsByUserId,
  createPet,
  getPetById,
  updatePet,
};
