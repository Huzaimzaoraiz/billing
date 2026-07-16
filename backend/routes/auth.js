const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const database = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const JWT_EXP = process.env.JWT_EXP || '1h';

// Limit login attempts per username+IP to reduce brute-force risk
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    keyGenerator: (req) => {
        const user = req.body && req.body.username ? req.body.username : 'anonymous';
        return `${user}:${req.ip}`;
    },
    handler: (req, res) => {
        res.set('Retry-After', String(Math.ceil(15 * 60))).status(429).json({ error: 'too many login attempts, try again later' });
    },
});

router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body || {};
        if (!username || !password) return res.status(400).json({ error: 'username and password required' });

        const user = await database.getUserByUsername(username);

        // Compare against real hash or a dummy to keep timing uniform
        const dummyHash = '$2b$10$1yqR./W7LgQ62f/N61i/yO1HkQ6Kj3Z4jX9Hk8Z2MvQ6H5vM3q6e';
        const match = user ? await bcrypt.compare(password, user.password_hash) : await bcrypt.compare(password, dummyHash);

        if (!user || !match) return res.status(401).json({ error: 'wrong username or password' });

        const token = jwt.sign({ user_id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXP });

        res.cookie('auth_token', token, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60, // 1 hour by default (match JWT_EXP if needed)
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
        });

        return res.json({ user_id: user.id, username: user.username, role: user.role });
    } catch (err) {
        console.error('login error:', err);
        return res.status(500).json({ error: 'internal server error' });
    }
});

router.post('/logout', async (req, res) => {
    try {
        res.clearCookie('auth_token');
        return res.json({ message: 'logged out' });
    } catch (err) {
        console.error('logout error:', err);
        return res.status(500).json({ error: 'internal server error' });
    }
});