const jwt = require('jsonwebtoken');
const { secret } = require('../config/jwt');

// Kiem tra token trong header "Authorization: Bearer <token>".
// Neu hop le: gan req.user = { id, role } roi cho di tiep.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      message: 'Authentication required',
    });
  }

  try {
    const payload = jwt.verify(token, secret);
    req.user = { id: payload.id, role: payload.role };
    return next();
  } catch (error) {
    return res.status(401).json({
      message: 'Invalid or expired token',
    });
  }
}

module.exports = requireAuth;