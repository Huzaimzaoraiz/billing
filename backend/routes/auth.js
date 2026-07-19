const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');

const database = require('../database');
const asyncHandler = require('../middleware/asyncHandler');
const { authMiddleware } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const JWT_EXP = process.env.JWT_EXP || '1h';
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'auth_token';

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, validate({ body: loginSchema }), asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const user = await database.getUserByUsername(username);

  const dummyHash = '$2b$10$1yqR./W7LgQ62f/N61i/yO1HkQ6Kj3Z4jX9Hk8Z2MvQ6H5vM3q6e';
  const match = user ? await bcrypt.compare(password, user.password_hash) : await bcrypt.compare(password, dummyHash);

  if (!user || !match || !user.is_active) return res.status(401).json({ error: 'wrong username or password' });

  const authUser = { user_id: user.id, name: user.name, email: user.email, role: user.role, branch_id: user.branch_id };
  const token = jwt.sign(authUser, JWT_SECRET, { expiresIn: JWT_EXP });

  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: 1000 * 60 * 60,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return res.json(authUser);
}));

router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  res.json(req.user);
}));

router.post('/logout', asyncHandler(async (req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME);
  return res.json({ message: 'logged out' });
}));

module.exports = router;
