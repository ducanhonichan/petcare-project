const pool = require('../config/db');

// Tim nguoi dung theo email (dung khi dang nhap)
async function findUserByEmail(email) {
  const [rows] = await pool.query(
    `SELECT id, name, email, password_hash, role, is_banned
     FROM users
     WHERE email = ?`,
    [email]
  );

  return rows[0] || null;
}

// Tao tai khoan moi. role, is_banned, remind_before_days, created_at
// da co gia tri mac dinh trong database.
// Neu email da ton tai, MySQL nem loi ER_DUP_ENTRY (cot email la UNIQUE).
async function createUser({ name, email, passwordHash }) {
  const [result] = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES (?, ?, ?)`,
    [name, email, passwordHash]
  );

  return { id: result.insertId, name, email, role: 'USER' };
}

// Lay ho so ca nhan (khong tra password_hash)
async function getUserProfile(userId) {
  const [rows] = await pool.query(
    `SELECT id, name, email, role, remind_before_days, created_at
     FROM users
     WHERE id = ?`,
    [userId]
  );

  return rows[0] || null;
}

module.exports = {
  findUserByEmail,
  createUser,
  getUserProfile,
};