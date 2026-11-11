
const express = require('express');
const router = express.Router();

const requireAuth = require('../middleware/requireAuth');

const {
  findOwnedPet,
  getWeightLogs,
  findWeightLog,
  createWeightLog,
  updateWeightLog,
  deleteWeightLog,
} = require('../services/weights.service');

router.use(requireAuth);

// Kiểm tra ID hợp lệ
function validId(value) {
  return /^\d+$/.test(String(value)) && Number(value) > 0;
}

// Kiểm tra ngày giờ và chuyển về định dạng MySQL DATETIME
function normalizeDateTime(value) {
  if (typeof value !== 'string') return null;

  const match =
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
      value.trim()
    );

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] || 0);

  const date = new Date(Date.UTC(year, month - 1, day));

  const validCalendarDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  if (
    !validCalendarDate ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return null;
  }

  return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}:${String(second).padStart(2, '0')}`;
}

// Kiểm tra dữ liệu cân nặng
function validateWeight(req, res, next) {
  const { weight_kg, measured_at, note } = req.body || {};

  const weight = Number(weight_kg);

  if (
    weight_kg === '' ||
    weight_kg === null ||
    weight_kg === undefined ||
    !Number.isFinite(weight) ||
    weight <= 0 ||
    weight > 9999.99 ||
    !/^\d+(\.\d{1,2})?$/.test(String(weight_kg))
  ) {
    return res.status(400).json({
      message: 'Weight must be a positive number with up to 2 decimal places.',
    });
  }

  const normalizedDateTime = normalizeDateTime(measured_at);

  if (!normalizedDateTime) {
    return res.status(400).json({
      message: 'Please provide a valid measurement date and time.',
    });
  }

  if (
    note !== undefined &&
    note !== null &&
    (typeof note !== 'string' || note.length > 5000)
  ) {
    return res.status(400).json({
      message: 'Note must be a string with a maximum of 5000 characters.',
    });
  }

  req.weightData = {
    weight_kg: weight,
    measured_at: normalizedDateTime,
    note: note?.trim() || null,
  };

  next();
}

// Kiểm tra pet có thuộc user đang đăng nhập hay không
async function checkPetOwnership(req, res, next) {
  try {
    const { petId } = req.params;
    const userId = req.user?.id;

    if (!validId(petId)) {
      return res.status(400).json({
        message: 'Invalid pet ID.',
      });
    }

    if (!userId) {
      return res.status(401).json({
        message: 'Authentication required.',
      });
    }

    const pet = await findOwnedPet(Number(petId), userId);

    if (!pet) {
      return res.status(404).json({
        message: 'Pet not found.',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}

// GET /api/pets/:petId/weights
// Lấy lịch sử cân nặng
router.get('/:petId/weights', checkPetOwnership, async (req, res, next) => {
  try {
    const weights = await getWeightLogs(Number(req.params.petId));

    return res.status(200).json({
      message: 'Weight history retrieved successfully.',
      data: weights,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/pets/:petId/weights
// Thêm lần cân mới
router.post(
  '/:petId/weights',
  checkPetOwnership,
  validateWeight,
  async (req, res, next) => {
    try {
      const petId = Number(req.params.petId);

      const weightId = await createWeightLog(
        petId,
        req.weightData
      );

      const weight = await findWeightLog(petId, weightId);

      return res.status(201).json({
        message: 'Weight record created successfully.',
        data: weight,
      });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          message: 'A weight record already exists at this date and time.',
        });
      }

      next(error);
    }
  }
);

// Kiểm tra lần cân có thuộc pet đang thao tác hay không
async function checkWeightOwnership(req, res, next) {
  try {
    const { petId, weightId } = req.params;

    if (!validId(weightId)) {
      return res.status(400).json({
        message: 'Invalid weight record ID.',
      });
    }

    const weight = await findWeightLog(
      Number(petId),
      Number(weightId)
    );

    if (!weight) {
      return res.status(404).json({
        message: 'Weight record not found.',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}

// PUT /api/pets/:petId/weights/:weightId
// Cập nhật lần cân
router.put(
  '/:petId/weights/:weightId',
  checkPetOwnership,
  checkWeightOwnership,
  validateWeight,
  async (req, res, next) => {
    try {
      const weight = await updateWeightLog(
        Number(req.params.petId),
        Number(req.params.weightId),
        req.weightData
      );

      if (!weight) {
        return res.status(404).json({
          message: 'Weight record not found.',
        });
      }

      return res.status(200).json({
        message: 'Weight record updated successfully.',
        data: weight,
      });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          message: 'A weight record already exists at this date and time.',
        });
      }

      next(error);
    }
  }
);

// DELETE /api/pets/:petId/weights/:weightId
// Xóa lần cân
router.delete(
  '/:petId/weights/:weightId',
  checkPetOwnership,
  checkWeightOwnership,
  async (req, res, next) => {
    try {
      const deleted = await deleteWeightLog(
        Number(req.params.petId),
        Number(req.params.weightId)
      );

      if (!deleted) {
        return res.status(404).json({
          message: 'Weight record not found.',
        });
      }

      return res.status(200).json({
        message: 'Weight record deleted successfully.',
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
