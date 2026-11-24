const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { secret } = require('../config/jwt');

// Kiem tra token trong header "Authorization: Bearer <token>".
// Neu hop le: gan req.user = { id, role } roi cho di tiep.
// Sau khi verify token, kiem tra lai trong DB de tai khoan bi xoa / bi khoa (R7)
// khong the tiep tuc dung token cu.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      message: 'Authentication required',
    });
  }

  let payload;

  try {
    payload = jwt.verify(token, secret);
  } catch (error) {
    return res.status(401).json({
      message: 'Invalid or expired token',
    });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, role, is_banned FROM users WHERE id = ? LIMIT 1',
      [payload.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        message: 'Invalid or expired token',
      });
    }

    if (rows[0].is_banned) {
      return res.status(403).json({ message: 'Account is banned' });
    }

    // Lay role tu DB (khong tin role trong token, vi admin co the doi role sau)
    req.user = { id: rows[0].id, role: rows[0].role };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = requireAuth;
