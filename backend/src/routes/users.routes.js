const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const {
  getUserProfile,
  updateUserProfile,
} = require('../services/auth.service');

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

// PUT /api/users/me - Cap nhat ho so (ten, so ngay nhac tiem truoc)
router.put('/me', requireAuth, async (req, res) => {
  try {
    const { name, remind_before_days } = req.body || {};
    const updates = {};

    if (name !== undefined) {
      if (
        typeof name !== 'string' ||
        !name.trim() ||
        name.trim().length > 100
      ) {
        return res.status(400).json({
          message: 'Name must be 1 to 100 characters',
        });
      }

      updates.name = name.trim();
    }

    if (remind_before_days !== undefined) {
      if (
        !Number.isInteger(remind_before_days) ||
        remind_before_days < 1 ||
        remind_before_days > 365
      ) {
        return res.status(400).json({
          message: 'remind_before_days must be a whole number from 1 to 365',
        });
      }

      updates.remind_before_days = remind_before_days;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Nothing to update' });
    }

    await updateUserProfile(req.user.id, updates);

    const profile = await getUserProfile(req.user.id);

    if (!profile) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json(profile);
  } catch (error) {
    console.error('Update profile error:', error);

    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;