const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { secret, expiresIn } = require('../config/jwt');
const { findUserByEmail, createUser } = require('../services/auth.service');

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Chi nhan chuoi, tranh truong hop client gui so hoac object
const str = (value) => (typeof value === 'string' ? value : '');

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, secret, { expiresIn });
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

// POST /api/auth/register - Dang ky tai khoan
router.post('/register', async (req, res) => {
  try {
    const body = req.body || {};
    const name = str(body.name).trim();
    const email = str(body.email).trim().toLowerCase();
    const password = str(body.password);

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: 'Invalid email' });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({ name, email, passwordHash });

    return res.status(201).json({
      token: signToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    // Email da ton tai (cot email la UNIQUE)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email already in use' });
    }

    console.error('Register error:', error);

    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/auth/login - Dang nhap
router.post('/login', async (req, res) => {
  try {
    const body = req.body || {};
    const email = str(body.email).trim().toLowerCase();
    const password = str(body.password);

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
      });
    }

    const user = await findUserByEmail(email);

    // Sai email hay sai mat khau deu tra cung mot thong bao
    const passwordOk =
      user && (await bcrypt.compare(password, user.password_hash));

    if (!passwordOk) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    if (user.is_banned) {
      return res.status(403).json({ message: 'Account is banned' });
    }

    return res.status(200).json({
      token: signToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    console.error('Login error:', error);

    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;