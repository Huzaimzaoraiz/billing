const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');

const { prisma } = require('../database');
const { AUTH_COOKIE_NAME, JWT_EXP, JWT_SECRET } = require('../config');
const asyncHandler = require('../middleware/asyncHandler');
const { authMiddleware } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();
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

const authCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

function normalizeRole(role) {
  return role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'STAFF';
}

router.post('/login', loginLimiter, validate({ body: loginSchema }), asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email: username } });

  const dummyHash = '$2b$10$1yqR./W7LgQ62f/N61i/yO1HkQ6Kj3Z4jX9Hk8Z2MvQ6H5vM3q6e';
  const match = user ? await bcrypt.compare(password, user.password_hash) : await bcrypt.compare(password, dummyHash);

  if (!user || !match || !user.is_active) return res.status(401).json({ error: 'wrong username or password' });

  const authUser = { user_id: user.id, name: user.name, email: user.email, role: normalizeRole(user.role), branch_id: user.branch_id };
  const token = jwt.sign(authUser, JWT_SECRET, { expiresIn: JWT_EXP });

  res.cookie(AUTH_COOKIE_NAME, token, {
    ...authCookieOptions,
    maxAge: 1000 * 60 * 60,
  });

  return res.json(authUser);
}));

router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  res.json(req.user);
}));

router.post('/logout', asyncHandler(async (req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, authCookieOptions);
  return res.json({ message: 'logged out' });
}));

module.exports = router;
