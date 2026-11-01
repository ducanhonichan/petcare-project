const express = require('express');
const pool = require('../config/db');

const router = express.Router();

// GET /api/species - Lay danh sach loai thu cung
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name FROM species ORDER BY name ASC'
    );

    return res.status(200).json(rows);
  } catch (error) {
    console.error('Get species error:', error);

    return res.status(500).json({
      message: 'Internal server error',
    });
  }
});

module.exports = router;