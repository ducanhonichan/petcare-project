const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { getUserProfile } = require('../services/auth.service');

const router = express.Router();

// GET /api/users/me - Xem ho so ca nhan (da qua requireAuth nen co req.user.id)
router.get('/me', requireAuth, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.id);

    if (!profile) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json(profile);
  } catch (error) {
    console.error('Get profile error:', error);

    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;