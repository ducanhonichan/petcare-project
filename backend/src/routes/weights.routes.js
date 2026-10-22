const express = require('express');
const requireAuth = require('../middleware/requireAuth');

const {
  findOwnedPet,
  getWeightLogs,
  createWeightLog,
  updateWeightLog,
  deleteWeightLog,
} = require('../services/weights.service');

const router = express.Router();

// Bao ve tat ca API can nang
router.use(requireAuth);

// Kiem tra ID nguyen duong
function validId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0;
}

// Kiem tra ngay gio theo dinh dang MySQL DATETIME
function validDateTime(value) {
  if (typeof value !== 'string') return false;

  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(value);

  if (!match) return false;

  const [, y, m, d, h, min, s] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, h, min, s));

  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() + 1 === m &&
    date.getUTCDate() === d &&
    date.getUTCHours() === h &&
    date.getUTCMinutes() === min &&
    date.getUTCSeconds() === s
  );
}

// Kiem tra du lieu can nang
function validateWeight(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return null;
  }

  const { weight_kg, measured_at, note = null } = body;

  if (
    typeof weight_kg !== 'number' ||
    !Number.isFinite(weight_kg) ||
    weight_kg <= 0 ||
    weight_kg > 9999.99 ||
    Math.round(weight_kg * 100) !== weight_kg * 100 ||
    !validDateTime(measured_at) ||
    (note !== null && (typeof note !== 'string' || note.length > 5000))
  ) {
    return null;
  }

  return {
    weight_kg,
    measured_at: measured_at.replace('T', ' '),
    note,
  };
}

// Kiem tra quyen so huu thu cung
router.use('/:petId/weights', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const petId = Number(req.params.petId);

    if (!userId) {
      return res.status(401).json({
        message: 'Authentication required',
      });
    }

    if (!validId(req.params.petId)) {
      return res.status(400).json({
        message: 'Invalid pet ID',
      });
    }

    const pet = await findOwnedPet(petId, userId);

    if (!pet) {
      return res.status(404).json({
        message: 'Pet not found',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
});

// GET - Xem lich su can nang
router.get('/:petId/weights', async (req, res, next) => {
  try {
    const logs = await getWeightLogs(Number(req.params.petId));
    return res.status(200).json(logs);
  } catch (error) {
    next(error);
  }
});

// POST - Them lan can
router.post('/:petId/weights', async (req, res, next) => {
  try {
    const data = validateWeight(req.body);

    if (!data) {
      return res.status(400).json({
        message: 'Invalid weight data',
      });
    }

    const id = await createWeightLog(Number(req.params.petId), data);

    return res.status(201).json({
      message: 'Weight log created successfully',
      id,
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: 'Weight already recorded at this time',
      });
    }

    next(error);
  }
});

// PUT - Sua lan can
router.put('/:petId/weights/:weightId', async (req, res, next) => {
  try {
    if (!validId(req.params.weightId)) {
      return res.status(400).json({
        message: 'Invalid weight ID',
      });
    }

    const data = validateWeight(req.body);

    if (!data) {
      return res.status(400).json({
        message: 'Invalid weight data',
      });
    }

    const updated = await updateWeightLog(
      Number(req.params.petId),
      Number(req.params.weightId),
      data
    );

    if (!updated) {
      return res.status(404).json({
        message: 'Weight log not found',
      });
    }

    return res.status(200).json({
      message: 'Weight log updated successfully',
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: 'Weight already recorded at this time',
      });
    }

    next(error);
  }
});

// DELETE - Xoa lan can
router.delete('/:petId/weights/:weightId', async (req, res, next) => {
  try {
    if (!validId(req.params.weightId)) {
      return res.status(400).json({
        message: 'Invalid weight ID',
      });
    }

    const deleted = await deleteWeightLog(
      Number(req.params.petId),
      Number(req.params.weightId)
    );

    if (!deleted) {
      return res.status(404).json({
        message: 'Weight log not found',
      });
    }

    return res.status(200).json({
      message: 'Weight log deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;