require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./src/config/db');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.json({ message: 'API is running' }));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ message: 'Database connected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database connection failed' });
  }
});

// Xử lý lỗi chung
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));