const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireAdmin = require('../middleware/requireAdmin');
const admin = require('../services/admin.service');

const router = express.Router();

// Every admin endpoint needs a valid token AND role ADMIN
router.use(requireAuth, requireAdmin);

function validId(value) {
  return /^\d+$/.test(String(value)) && Number(value) > 0;
}

// ---------- Users ----------

// GET /api/admin/users
router.get('/users', async (req, res, next) => {
  try {
    res.json(await admin.listUsers());
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/users/:id/status   body: { "is_banned": true | false }
router.put('/users/:id/status', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const { is_banned } = req.body || {};

    if (typeof is_banned !== 'boolean') {
      return res.status(400).json({ message: 'is_banned must be true or false' });
    }

    const id = Number(req.params.id);
    const user = await admin.findUser(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Stop an admin from locking themselves (or another admin) out
    if (is_banned && (user.id === req.user.id || user.role === 'ADMIN')) {
      return res.status(400).json({ message: 'Admin accounts cannot be banned' });
    }

    await admin.setUserBanned(id, is_banned);

    res.json({
      message: is_banned ? 'User banned' : 'User unbanned',
      user: { ...user, is_banned },
    });
  } catch (error) {
    next(error);
  }
});

// ---------- Vaccine types ----------

// Validate the body of POST / PUT. Returns { error } or { data }.
async function buildTypeData(body, { forUpdate = false } = {}) {
  const { name, species_id, interval_days, description, is_active } =
    body || {};

  if (typeof name !== 'string' || !name.trim() || name.trim().length > 150) {
    return { error: 'Name must be 1 to 150 characters' };
  }

  if (!Number.isSafeInteger(species_id) || species_id <= 0) {
    return { error: 'A valid species_id is required' };
  }

  if (!(await admin.speciesExists(species_id))) {
    return { error: 'Species not found' };
  }

  if (
    interval_days !== undefined &&
    interval_days !== null &&
    (!Number.isInteger(interval_days) ||
      interval_days < 1 ||
      interval_days > 3650)
  ) {
    return { error: 'interval_days must be a whole number from 1 to 3650, or empty' };
  }

  if (
    description !== undefined &&
    description !== null &&
    (typeof description !== 'string' || description.length > 5000)
  ) {
    return { error: 'description must be text up to 5000 characters' };
  }

  if (is_active !== undefined && typeof is_active !== 'boolean') {
    return { error: 'is_active must be true or false' };
  }

  return {
    data: {
      name: name.trim(),
      species_id,
      interval_days: interval_days ?? null,
      description: description?.trim() || null,
      is_active: forUpdate ? is_active : undefined,
    },
  };
}

// GET /api/admin/vaccine-types (includes hidden types)
router.get('/vaccine-types', async (req, res, next) => {
  try {
    res.json(await admin.listVaccineTypes());
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/vaccine-types
router.post('/vaccine-types', async (req, res, next) => {
  try {
    const { error, data } = await buildTypeData(req.body);

    if (error) {
      return res.status(400).json({ message: error });
    }

    const id = await admin.createVaccineType(data);

    res.status(201).json({
      message: 'Vaccine type created',
      data: await admin.findVaccineType(id),
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/vaccine-types/:id
router.put('/vaccine-types/:id', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid vaccine type ID' });
    }

    const id = Number(req.params.id);
    const current = await admin.findVaccineType(id);

    if (!current) {
      return res.status(404).json({ message: 'Vaccine type not found' });
    }

    const { error, data } = await buildTypeData(req.body, { forUpdate: true });

    if (error) {
      return res.status(400).json({ message: error });
    }

    await admin.updateVaccineType(id, {
      ...data,
      is_active: data.is_active ?? current.is_active,
    });

    res.json({
      message: 'Vaccine type updated',
      data: await admin.findVaccineType(id),
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/vaccine-types/:id (hides it, is_active = false)
router.delete('/vaccine-types/:id', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid vaccine type ID' });
    }

    const id = Number(req.params.id);

    if (!(await admin.findVaccineType(id))) {
      return res.status(404).json({ message: 'Vaccine type not found' });
    }

    await admin.hideVaccineType(id);

    res.json({ message: 'Vaccine type hidden' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
