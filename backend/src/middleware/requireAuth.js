
function requireAuth(req, res, next) {
  return res.status(401).json({
    message: 'Authentication is required. JWT integration is pending.',
  });
}

module.exports = requireAuth;
