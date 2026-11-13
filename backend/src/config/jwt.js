require('dotenv').config();

if (!process.env.JWT_SECRET) {
  throw new Error('Missing JWT_SECRET in .env');
}

module.exports = {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
};