// Temporary authentication guard until T10 is integrated.
function requireAuth(req, res, next) {
  return res.status(401).json({
    message: 'Authentication required',
  });
}

module.exports = requireAuth;