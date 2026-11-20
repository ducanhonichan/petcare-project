const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { todayString } = require('../utils/dates');

const {
  getRemindBeforeDays,
  getLatestDoses,
  classify,
} = require('../services/reminders.service');

const router = express.Router();

// GET /api/reminders/upcoming?days=30
// Vaccinations of all my pets, grouped as overdue / due soon / later.
// "days" is optional and replaces the user's remind_before_days.
router.get('/upcoming', requireAuth, async (req, res, next) => {
  try {
    let windowDays;

    if (req.query.days !== undefined) {
      windowDays = Number(req.query.days);

      if (!Number.isInteger(windowDays) || windowDays < 1 || windowDays > 365) {
        return res.status(400).json({
          message: 'days must be a whole number from 1 to 365',
        });
      }
    } else {
      windowDays = await getRemindBeforeDays(req.user.id);
    }

    const today = todayString();
    const doses = await getLatestDoses(req.user.id);

    const result = {
      today,
      remind_before_days: windowDays,
      summary: { overdue: 0, due_soon: 0, later: 0, total: doses.length },
      overdue: [],
      due_soon: [],
      later: [],
    };

    for (const dose of doses) {
      const { status, days_until_due } = classify(
        dose.next_due_date,
        today,
        windowDays
      );

      const key = status.toLowerCase();

      result[key].push({ ...dose, status, days_until_due });
      result.summary[key] += 1;
    }

    return res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
