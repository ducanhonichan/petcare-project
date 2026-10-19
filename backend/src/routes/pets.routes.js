const express = require('express');
const requireAuth = require('../middleware/requireAuth');



const {
  getPetsByUserId,
  createPet,
  getPetById,
  updatePet,
  softDeletePet,
} = require('../services/pets.service');


const router = express.Router();

// Bao ve tat ca API thu cung
router.use(requireAuth);

// GET /api/pets - Lay danh sach thu cung cua nguoi dung
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        message: 'Authentication required',
      });
    }

    const pets = await getPetsByUserId(userId);

    return res.status(200).json(pets);
  } catch (error) {
    console.error('Get pets error:', error);

    return res.status(500).json({
      message: 'Internal server error',
    });
  }
});






// POST /api/pets - Them thu cung moi
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        message: 'Authentication required',
      });
    }

    const {
      name,
      species_id,
      gender = 'UNKNOWN',
    } = req.body || {};

    // Kiem tra du lieu bat buoc
    if (
      typeof name !== 'string' ||
      !name.trim() ||
      !Number.isSafeInteger(species_id) ||
      species_id <= 0
    ) {
      return res.status(400).json({
        message: 'Valid name and species_id are required',
      });
    }

    // Kiem tra gioi tinh
    if (!['MALE', 'FEMALE', 'UNKNOWN'].includes(gender)) {
      return res.status(400).json({
        message: 'Invalid gender',
      });
    }






// Kiem tra cac truong van ban tuy chon
const optionalTextFields = {
  breed: 100,
  color: 100,
  avatar_url: 500,
  note: 5000,
};

for (const [field, maxLength] of Object.entries(optionalTextFields)) {
  const value = req.body[field];

  if (
    value !== undefined &&
    value !== null &&
    (typeof value !== 'string' || value.length > maxLength)
  ) {
    return res.status(400).json({
      message: `Invalid ${field}`,
    });
  }
}

// Kiem tra ngay sinh neu duoc cung cap
const birthDate = req.body.birth_date;

if (birthDate !== undefined && birthDate !== null) {
  if (
    typeof birthDate !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(birthDate) ||
    !Number.isFinite(Date.parse(`${birthDate}T00:00:00Z`)) ||
    new Date(`${birthDate}T00:00:00Z`)
      .toISOString()
      .slice(0, 10) !== birthDate
  ) {
    return res.status(400).json({
      message: 'Invalid birth_date. Use YYYY-MM-DD',
    });
  }
}









    const petId = await createPet(userId, {
      ...req.body,
      name: name.trim(),
      species_id,
      gender,
    });

    return res.status(201).json({
      message: 'Pet created successfully',
      id: petId,
    });
  } catch (error) {
    console.error('Create pet error:', error);

    return res.status(500).json({
      message: 'Internal server error',
    });
  }
});







// GET /api/pets/:id - Lay chi tiet thu cung
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user?.id;
    const petId = Number(req.params.id);

    if (!userId) {
      return res.status(401).json({
        message: 'Authentication required',
      });
    }

    if (!Number.isSafeInteger(petId) || petId <= 0) {
      return res.status(400).json({
        message: 'Invalid pet ID',
      });
    }

    const pet = await getPetById(petId, userId);

    if (!pet) {
      return res.status(404).json({
        message: 'Pet not found',
      });
    }

    return res.status(200).json(pet);
  } catch (error) {
    console.error('Get pet detail error:', error);

    return res.status(500).json({
      message: 'Internal server error',
    });
  }
});





// PUT /api/pets/:id - Cap nhat thong tin thu cung
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user?.id;
    const petId = Number(req.params.id);

    if (!userId) {
      return res.status(401).json({
        message: 'Authentication required',
      });
    }

    if (!Number.isSafeInteger(petId) || petId <= 0) {
      return res.status(400).json({
        message: 'Invalid pet ID',
      });
    }

    const {
      name,
      species_id,
      gender = 'UNKNOWN',
      breed = null,
      birth_date = null,
      color = null,
      avatar_url = null,
      note = null,
    } = req.body || {};

    // Kiem tra cac truong bat buoc
    if (
      typeof name !== 'string' ||
      !name.trim() ||
      name.trim().length > 100 ||
      !Number.isSafeInteger(species_id) ||
      species_id <= 0
    ) {
      return res.status(400).json({
        message: 'Valid name and species_id are required',
      });
    }

    // Kiem tra gioi tinh
    if (!['MALE', 'FEMALE', 'UNKNOWN'].includes(gender)) {
      return res.status(400).json({
        message: 'Invalid gender',
      });
    }

    // Kiem tra cac truong van ban tuy chon
    const optionalTextFields = {
      breed: 100,
      color: 100,
      avatar_url: 500,
      note: 5000,
    };

    const optionalValues = { breed, color, avatar_url, note };

    for (const [field, maxLength] of Object.entries(optionalTextFields)) {
      const value = optionalValues[field];

      if (
        value !== null &&
        (typeof value !== 'string' || value.length > maxLength)
      ) {
        return res.status(400).json({
          message: `Invalid ${field}`,
        });
      }
    }

    // Kiem tra ngay sinh
    if (birth_date !== null) {
      const date =
        typeof birth_date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(birth_date)
          ? new Date(`${birth_date}T00:00:00Z`)
          : null;

      if (
        !date ||
        !Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 10) !== birth_date
      ) {
        return res.status(400).json({
          message: 'Invalid birth_date. Use YYYY-MM-DD',
        });
      }
    }

    const updated = await updatePet(petId, userId, {
      name: name.trim(),
      species_id,
      gender,
      breed,
      birth_date,
      color,
      avatar_url,
      note,
    });

    if (!updated) {
      return res.status(404).json({
        message: 'Pet not found',
      });
    }

    return res.status(200).json({
      message: 'Pet updated successfully',
    });
  } catch (error) {
    console.error('Update pet error:', error);

    return res.status(500).json({
      message: 'Internal server error',
    });
  }
});





// DELETE /api/pets/:id - Xoa mem thu cung
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user?.id;
    const petId = Number(req.params.id);

    if (!userId) {
      return res.status(401).json({
        message: 'Authentication required',
      });
    }

    if (!Number.isSafeInteger(petId) || petId <= 0) {
      return res.status(400).json({
        message: 'Invalid pet ID',
      });
    }

    const deleted = await softDeletePet(petId, userId);

    if (!deleted) {
      return res.status(404).json({
        message: 'Pet not found',
      });
    }

    return res.status(200).json({
      message: 'Pet deleted successfully',
    });
  } catch (error) {
    console.error('Delete pet error:', error);

    return res.status(500).json({
      message: 'Internal server error',
    });
  }
});






module.exports = router;