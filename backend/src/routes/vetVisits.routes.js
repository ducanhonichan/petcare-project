
const express = require('express');
const requireAuth = require('../middleware/requireAuth');

const {
  checkPetOwnership,
  getVisitsByPet,
  createVisit,
  deleteVisit,
} = require('../services/vetVisits.service');

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Check pet ownership before accessing visit data
router.use('/:petId/visits', async (req, res, next) => {
  try {
    const petId = Number(req.params.petId);

    if (!Number.isSafeInteger(petId) || petId <= 0) {
      return res.status(400).json({ message: 'Invalid pet ID' });
    }

    const belongsToUser = await checkPetOwnership(
      petId,
      req.user.id
    );

    if (!belongsToUser) {
      return res.status(404).json({ message: 'Pet not found' });
    }

    next();
  } catch (error) {
    next(error);
  }
});

// GET /api/pets/:petId/visits
router.get('/:petId/visits', async (req, res, next) => {
  try {
    const visits = await getVisitsByPet(Number(req.params.petId));
    res.json(visits);
  } catch (error) {
    next(error);
  }
});

// POST /api/pets/:petId/visits
router.post('/:petId/visits', async (req, res, next) => {
  try {
    const { visit_date, clinic, reason, diagnosis, cost, note } =
      req.body || {};

    const validDate =
      typeof visit_date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(visit_date) &&
      !Number.isNaN(Date.parse(visit_date));

    if (!validDate) {
      return res.status(400).json({
        message: 'A valid visit_date (YYYY-MM-DD) is required',
      });
    }

    if (cost != null && (
      typeof cost !== 'number' ||
      !Number.isFinite(cost) ||
      cost < 0
    )) {
      return res.status(400).json({
        message: 'Cost must be a non-negative number',
      });
    }

    const id = await createVisit(Number(req.params.petId), {
      visit_date,
      clinic,
      reason,
      diagnosis,
      cost,
      note,
    });

    res.status(201).json({
      message: 'Veterinary visit created',
      id,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/pets/:petId/visits/:visitId
router.delete('/:petId/visits/:visitId', async (req, res, next) => {
  try {
    const visitId = Number(req.params.visitId);

    if (!Number.isSafeInteger(visitId) || visitId <= 0) {
      return res.status(400).json({
        message: 'Invalid visit ID',
      });
    }

    const deleted = await deleteVisit(
      visitId,
      Number(req.params.petId)
    );

    if (!deleted) {
      return res.status(404).json({
        message: 'Visit not found',
      });
    }

    res.json({ message: 'Veterinary visit deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
