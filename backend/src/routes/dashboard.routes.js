const router = require('express').Router();
const requireAuth = require('../middleware/requireAuth');
const { getDashboard } = require('../services/dashboard.service');
router.get('/', requireAuth, async (req, res) => {
  try {
    res.json(await getDashboard(req.user.id));
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Unable to load dashboard records' });
  }
});
module.exports = router;
