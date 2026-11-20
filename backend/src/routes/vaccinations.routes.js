const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { todayString, isValidDate, addDays } = require('../utils/dates');

const {
  findOwnedPet,
  getVaccineTypes,
  findVaccineType,
  getVaccinationsByPet,
  findOwnedVaccination,
  findVaccination,
  createVaccination,
  updateVaccination,
  deleteVaccination,
} = require('../services/vaccinations.service');

const router = express.Router();

function validId(value) {
  return /^\d+$/.test(String(value)) && Number(value) > 0;
}

// Validate the body of POST / PUT and work out next_due_date (R3).
// Returns { error } or { data }.
async function buildVaccinationData(body, pet, currentTypeId = null) {
  const {
    vaccine_type_id,
    given_date,
    next_due_date,
    clinic,
    note,
  } = body || {};

  if (!validId(vaccine_type_id)) {
    return { error: 'A valid vaccine_type_id is required' };
  }

  if (!isValidDate(given_date)) {
    return { error: 'A valid given_date (YYYY-MM-DD) is required' };
  }

  if (given_date > todayString()) {
    return { error: 'given_date cannot be in the future' };
  }

  const type = await findVaccineType(Number(vaccine_type_id));

  if (!type) {
    return { error: 'Vaccine type not found' };
  }

  // An old record may keep a type that was hidden later by an admin
  if (!type.is_active && type.id !== currentTypeId) {
    return { error: 'This vaccine type is no longer available' };
  }

  if (type.species_id !== pet.species_id) {
    return { error: 'This vaccine type is not for this pet species' };
  }

  let dueDate;

  if (next_due_date === undefined || next_due_date === null || next_due_date === '') {
    // Not given: given_date + interval_days (null when the vaccine has no interval)
    dueDate = type.interval_days
      ? addDays(given_date, type.interval_days)
      : null;
  } else if (!isValidDate(next_due_date)) {
    return { error: 'next_due_date must be a valid date (YYYY-MM-DD)' };
  } else if (next_due_date < given_date) {
    return { error: 'next_due_date cannot be before given_date' };
  } else {
    dueDate = next_due_date;
  }

  if (
    [clinic, note].some((v) => v != null && typeof v !== 'string') ||
    (clinic != null && clinic.trim().length > 255) ||
    (note != null && Buffer.byteLength(note.trim(), 'utf8') > 65535)
  ) {
    return { error: 'Clinic or note is invalid or too long' };
  }

  return {
    data: {
      vaccine_type_id: type.id,
      given_date,
      next_due_date: dueDate,
      clinic: clinic?.trim() || null,
      note: note?.trim() || null,
    },
  };
}

// GET /api/vaccine-types?speciesId=1
router.get('/vaccine-types', requireAuth, async (req, res, next) => {
  try {
    const { speciesId } = req.query;

    if (speciesId !== undefined && !validId(speciesId)) {
      return res.status(400).json({ message: 'Invalid speciesId' });
    }

    const types = await getVaccineTypes(
      speciesId ? Number(speciesId) : null
    );

    return res.json(types);
  } catch (error) {
    next(error);
  }
});

// Check the pet in the URL belongs to the logged-in user.
// Other people's pets answer 404, the same as a pet that does not exist (R1).
async function checkPetOwnership(req, res, next) {
  try {
    if (!validId(req.params.petId)) {
      return res.status(400).json({ message: 'Invalid pet ID' });
    }

    const pet = await findOwnedPet(Number(req.params.petId), req.user.id);

    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }

    req.pet = pet;
    next();
  } catch (error) {
    next(error);
  }
}

// GET /api/pets/:petId/vaccinations
router.get(
  '/pets/:petId/vaccinations',
  requireAuth,
  checkPetOwnership,
  async (req, res, next) => {
    try {
      return res.json(await getVaccinationsByPet(req.pet.id));
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/pets/:petId/vaccinations
router.post(
  '/pets/:petId/vaccinations',
  requireAuth,
  checkPetOwnership,
  async (req, res, next) => {
    try {
      const { error, data } = await buildVaccinationData(req.body, req.pet);

      if (error) {
        return res.status(400).json({ message: error });
      }

      const id = await createVaccination(req.pet.id, data);

      return res.status(201).json({
        message: 'Vaccination created',
        data: await findVaccination(id),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Check the vaccination in the URL belongs to one of the user's pets
async function checkVaccinationOwnership(req, res, next) {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid vaccination ID' });
    }

    const vaccination = await findOwnedVaccination(
      Number(req.params.id),
      req.user.id
    );

    if (!vaccination) {
      return res.status(404).json({ message: 'Vaccination not found' });
    }

    req.vaccination = vaccination;
    next();
  } catch (error) {
    next(error);
  }
}

// PUT /api/vaccinations/:id
router.put(
  '/vaccinations/:id',
  requireAuth,
  checkVaccinationOwnership,
  async (req, res, next) => {
    try {
      const pet = await findOwnedPet(
        req.vaccination.pet_id,
        req.user.id
      );

      const { error, data } = await buildVaccinationData(
        req.body,
        pet,
        req.vaccination.vaccine_type_id
      );

      if (error) {
        return res.status(400).json({ message: error });
      }

      await updateVaccination(req.vaccination.id, data);

      return res.json({
        message: 'Vaccination updated',
        data: await findVaccination(req.vaccination.id),
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/vaccinations/:id
router.delete(
  '/vaccinations/:id',
  requireAuth,
  checkVaccinationOwnership,
  async (req, res, next) => {
    try {
      await deleteVaccination(req.vaccination.id);

      return res.json({ message: 'Vaccination deleted' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
